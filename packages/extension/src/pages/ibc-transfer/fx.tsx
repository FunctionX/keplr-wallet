import React, { FunctionComponent, useState } from "react";
import { observer } from "mobx-react-lite";
import { HeaderLayout } from "../../layouts";
import { useHistory } from "react-router";

import {
  IAmountConfig,
  IFeeConfig,
  IGasConfig,
  IIBCChannelConfig,
  IMemoConfig,
  IRecipientConfig,
  useIBCTransferConfig,
} from "@keplr-wallet/hooks";
import { useStore } from "../../stores";
import { EthereumEndpoint } from "../../config.ui";
import { useNotification } from "../../components/notification";
import { ChainIdHelper } from "@keplr-wallet/cosmos";
import { Dec, DecUtils, Int } from "@keplr-wallet/unit";
import { MsgTransfer } from "@keplr-wallet/proto-types/fx/ibc/applications/transfer/v1/tx";
import { FormattedMessage, useIntl } from "react-intl";
import style from "./style.module.scss";
import {
  AddressInput,
  CoinInput,
  DestinationChainSelector,
  FeeButtons,
  Input,
  MemoInput,
} from "../../components/form";
import { Alert, Button } from "reactstrap";

export const FxIBCTransferPage: FunctionComponent = observer(() => {
  const history = useHistory();

  const [phase, setPhase] = useState<"channel" | "amount">("channel");

  const { chainStore, accountStore, queriesStore } = useStore();
  const accountInfo = accountStore.getAccount(chainStore.current.chainId);

  const notification = useNotification();

  const ibcTransferConfigs = useIBCTransferConfig(
    chainStore,
    queriesStore,
    accountStore,
    chainStore.current.chainId,
    accountInfo.bech32Address,
    EthereumEndpoint
  );

  return (
    <HeaderLayout
      showChainName={true}
      canChangeChainInfo={false}
      onBackButton={() => {
        history.goBack();
      }}
    >
      {phase === "channel" ? (
        <FxIBCTransferPageChannel
          channelConfig={ibcTransferConfigs.channelConfig}
          recipientConfig={ibcTransferConfigs.recipientConfig}
          memoConfig={ibcTransferConfigs.memoConfig}
          onNext={() => {
            setPhase("amount");
          }}
        />
      ) : null}
      {phase === "amount" ? (
        <FxIBCTransferPageAmount
          amountConfig={ibcTransferConfigs.amountConfig}
          feeConfig={ibcTransferConfigs.feeConfig}
          gasConfig={ibcTransferConfigs.gasConfig}
          onSubmit={async () => {
            const channel = ibcTransferConfigs.channelConfig.channel;

            if (channel) {
              try {
                const actualAmount = (() => {
                  let dec = new Dec(ibcTransferConfigs.amountConfig.amount);
                  dec = dec.mul(
                    DecUtils.getTenExponentNInPrecisionRange(
                      ibcTransferConfigs.amountConfig.sendCurrency.coinDecimals
                    )
                  );
                  return dec.truncate().toString();
                })();
                const destinationInfo = queriesStore.get(
                  channel.counterpartyChainId
                ).cosmos.queryRPCStatus;

                await accountInfo.cosmos.sendMsgs(
                  "ibcTransfer",
                  async () => {
                    // Wait until fetching complete.
                    await destinationInfo.waitFreshResponse();

                    if (!destinationInfo.network) {
                      throw new Error(
                        `Failed to fetch the network chain id of ${channel.counterpartyChainId}`
                      );
                    }

                    if (
                      ChainIdHelper.parse(destinationInfo.network)
                        .identifier !==
                      ChainIdHelper.parse(channel.counterpartyChainId)
                        .identifier
                    ) {
                      throw new Error(
                        `Fetched the network chain id is different with counterparty chain id (${destinationInfo.network}, ${channel.counterpartyChainId})`
                      );
                    }

                    if (
                      !destinationInfo.latestBlockHeight ||
                      destinationInfo.latestBlockHeight.equals(new Int("0"))
                    ) {
                      throw new Error(
                        `Failed to fetch the latest block of ${channel.counterpartyChainId}`
                      );
                    }
                    const timeout = new Date();
                    timeout.setDate(timeout.getDate() + 1);
                    const msg = {
                      type: "cosmos-sdk/MsgTransfer",
                      value: {
                        source_port: channel.portId,
                        source_channel: channel.channelId,
                        token: {
                          denom:
                            ibcTransferConfigs.amountConfig.sendCurrency
                              .coinMinimalDenom,
                          amount: actualAmount,
                        },
                        sender: accountInfo.bech32Address,
                        receiver: ibcTransferConfigs.recipientConfig.recipient,
                        timeout_height: {
                          revision_number: ChainIdHelper.parse(
                            destinationInfo.network
                          ).version.toString() as string | undefined,
                          // Set the timeout height as the current height + 150.
                          revision_height: destinationInfo.latestBlockHeight
                            .add(new Int("150"))
                            .toString(),
                        },
                        timeout_timestamp: (
                          Date.parse(timeout.toString()) * 1_000_000
                        ).toString(),
                        router: undefined,
                        fee: {
                          denom:
                            ibcTransferConfigs.amountConfig.sendCurrency
                              .coinMinimalDenom,
                          amount: "0",
                        },
                      },
                    };
                    if (msg.value.timeout_height.revision_number === "0") {
                      delete msg.value.timeout_height.revision_number;
                    }

                    return {
                      aminoMsgs: [msg],
                      protoMsgs: [
                        {
                          typeUrl:
                            "/fx.ibc.applications.transfer.v1.MsgTransfer",
                          value: MsgTransfer.encode(
                            MsgTransfer.fromPartial({
                              sourcePort: msg.value.source_port,
                              sourceChannel: msg.value.source_channel,
                              token: msg.value.token,
                              sender: msg.value.sender,
                              receiver: msg.value.receiver,
                              timeoutHeight: {
                                revisionNumber: msg.value.timeout_height
                                  .revision_number
                                  ? msg.value.timeout_height.revision_number
                                  : "0",
                                revisionHeight:
                                  msg.value.timeout_height.revision_height,
                              },
                              timeoutTimestamp:
                                msg.value.timeout_timestamp ?? "",
                              router: msg.value.router ?? "",
                              fee:
                                msg.value.fee && msg.value.fee.denom !== ""
                                  ? {
                                      denom: msg.value.fee.denom,
                                      amount: msg.value.fee.amount,
                                    }
                                  : undefined,
                            })
                          ).finish(),
                        },
                      ],
                    };
                  },
                  ibcTransferConfigs.memoConfig.memo,
                  ibcTransferConfigs.feeConfig.toStdFee(),
                  {
                    preferNoSetFee: true,
                    preferNoSetMemo: true,
                  },
                  undefined
                );
                history.push("/");
              } catch (e) {
                history.replace("/");
                notification.push({
                  type: "warning",
                  placement: "top-center",
                  duration: 5,
                  content: `Fail to ibc transfer token: ${e.message}`,
                  canDelete: true,
                  transition: {
                    duration: 0.25,
                  },
                });
              }
            }
          }}
        />
      ) : null}
    </HeaderLayout>
  );
});

export const FxIBCTransferPageChannel: FunctionComponent<{
  channelConfig: IIBCChannelConfig;
  recipientConfig: IRecipientConfig;
  memoConfig: IMemoConfig;
  onNext: () => void;
}> = observer(({ channelConfig, recipientConfig, memoConfig, onNext }) => {
  const intl = useIntl();
  const isValid =
    channelConfig.error == null &&
    recipientConfig.error == null &&
    memoConfig.error == null;

  const isChannelSet = channelConfig.channel != null;

  return (
    <form className={style.formContainer}>
      <div className={style.formInnerContainer}>
        <DestinationChainSelector ibcChannelConfig={channelConfig} />
        <AddressInput
          label={intl.formatMessage({
            id: "send.input.recipient",
          })}
          recipientConfig={recipientConfig}
          memoConfig={memoConfig}
          ibcChannelConfig={channelConfig}
          disabled={!isChannelSet}
        />
        <MemoInput
          label={intl.formatMessage({
            id: "send.input.memo",
          })}
          memoConfig={memoConfig}
          disabled={!isChannelSet}
        />
        <div style={{ flex: 1 }} />
        <Alert className={style.alert}>
          <i className="fas fa-exclamation-circle" />
          <div>
            <h1>IBC is production ready</h1>
            <p>
              However, all new technologies should be used with caution. We
              recommend only transferring small amounts.
            </p>
          </div>
        </Alert>
        <Button
          type="submit"
          color="primary"
          block
          disabled={!isValid}
          onClick={(e) => {
            e.preventDefault();

            onNext();
          }}
        >
          <FormattedMessage id="ibc.transfer.next" />
        </Button>
      </div>
    </form>
  );
});

export const FxIBCTransferPageAmount: FunctionComponent<{
  amountConfig: IAmountConfig;
  feeConfig: IFeeConfig;
  gasConfig: IGasConfig;
  onSubmit: () => void;
}> = observer(({ amountConfig, feeConfig, gasConfig, onSubmit }) => {
  const intl = useIntl();
  const { accountStore, chainStore, priceStore } = useStore();

  const accountInfo = accountStore.getAccount(chainStore.current.chainId);

  const isValid =
    amountConfig.error == null &&
    feeConfig.error == null &&
    gasConfig.error == null;

  return (
    <form className={style.formContainer}>
      <div className={style.formInnerContainer}>
        <CoinInput
          label={intl.formatMessage({
            id: "send.input.amount",
          })}
          amountConfig={amountConfig}
        />
        <Input type="number" label="Bridge Fee" />
        <Input type="text" label="Router" />
        <div style={{ flex: 1 }} />
        <FeeButtons
          label={intl.formatMessage({
            id: "send.input.fee",
          })}
          feeConfig={feeConfig}
          gasConfig={gasConfig}
          priceStore={priceStore}
        />
        <Button
          type="submit"
          color="primary"
          block
          disabled={!isValid}
          data-loading={accountInfo.isSendingMsg === "ibcTransfer"}
          onClick={(e) => {
            e.preventDefault();

            onSubmit();
          }}
        >
          <FormattedMessage id="ibc.transfer.submit" />
        </Button>
      </div>
    </form>
  );
});
