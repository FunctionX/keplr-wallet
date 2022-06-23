import React, { FunctionComponent, useEffect, useState } from "react";

import { HeaderLayout } from "../../layouts";

import {
  Alert,
  Button,
  ButtonDropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  FormGroup,
  Label,
} from "reactstrap";

import { observer } from "mobx-react-lite";

import style from "./style.module.scss";

import { useHistory } from "react-router";
import { useStore } from "../../stores";
import { CoinInput, FeeButtons, Input, MemoInput } from "../../components/form";
import {
  useAmountConfig,
  useFeeConfig,
  useGasConfig,
  useMemoConfig,
} from "@keplr-wallet/hooks";
import { useIntl } from "react-intl";
import { useNotification } from "../../components/notification";
import classnames from "classnames";
import styleCoinInput from "../../components/form/coin-input.module.scss";
import { MsgSendToEth } from "@keplr-wallet/proto-types/fx/gravity/v1/tx";
import { Dec, DecUtils } from "@keplr-wallet/unit";
import { MsgSendToExternal } from "@keplr-wallet/proto-types/fx/crosschain/v1/tx";

export const GravityPage: FunctionComponent = observer(() => {
  const history = useHistory();

  useEffect(() => {
    // Scroll to top on page mounted.
    if (window.scrollTo) {
      window.scrollTo(0, 0);
    }
  }, []);

  const { chainStore, queriesStore, accountStore, priceStore } = useStore();
  const accountInfo = accountStore.getAccount(chainStore.current.chainId);

  const intl = useIntl();

  const notification = useNotification();

  const memoConfig = useMemoConfig(chainStore, chainStore.current.chainId);
  const gasConfig = useGasConfig(
    chainStore,
    chainStore.current.chainId,
    130000
  );
  const amountConfig = useAmountConfig(
    chainStore,
    queriesStore,
    chainStore.current.chainId,
    accountInfo.bech32Address
  );
  const feeConfig = useFeeConfig(
    chainStore,
    queriesStore,
    chainStore.current.chainId,
    accountInfo.bech32Address,
    amountConfig,
    gasConfig
  );
  const [recipient, setRecipient] = useState("");

  const [bridgeFee, setBridgeFee] = useState("");

  const destinations = ["Ethereum", "Binance Smart Chain", "Polygon", "Tron"];
  const [destination, setDestination] = useState("Ethereum");
  const [isOpenSelector, setIsOpenSelector] = useState(false);

  const [randomId] = useState(() => {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    return Buffer.from(bytes).toString("hex");
  });

  const configError =
    amountConfig.error ??
    memoConfig.error ??
    gasConfig.error ??
    feeConfig.error;
  const txStateIsValid = configError == null;

  return (
    <HeaderLayout
      showChainName
      canChangeChainInfo={false}
      onBackButton={() => {
        history.goBack();
      }}
      rightRenderer={
        <div
          style={{
            height: "64px",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            paddingRight: "20px",
          }}
        />
      }
    >
      <form
        className={style.formContainer}
        onSubmit={async (e) => {
          e.preventDefault();
          if (accountInfo.isReadyToSendMsgs) {
            try {
              const stdFee = feeConfig.toStdFee();
              let amountDec = new Dec(amountConfig.amount);
              amountDec = amountDec.mulTruncate(
                DecUtils.getTenExponentNInPrecisionRange(
                  amountConfig.sendCurrency.coinDecimals
                )
              );
              let bridgeFeeDec = new Dec(bridgeFee);
              bridgeFeeDec = bridgeFeeDec.mulTruncate(
                DecUtils.getTenExponentNInPrecisionRange(
                  amountConfig.sendCurrency.coinDecimals
                )
              );
              if (destination === "Ethereum") {
                const msg = {
                  type: "gravity/MsgSendToEth",
                  value: {
                    sender: accountInfo.bech32Address,
                    eth_dest: recipient,
                    amount: {
                      denom: amountConfig.sendCurrency.coinMinimalDenom,
                      amount: amountDec.truncate().toString(),
                    },
                    bridge_fee: {
                      denom: amountConfig.sendCurrency.coinMinimalDenom,
                      amount: bridgeFeeDec.truncate().toString(),
                    },
                  },
                };
                await accountInfo.cosmos.sendMsgs(
                  "gravityTransfer",
                  {
                    aminoMsgs: [msg],
                    protoMsgs: [
                      {
                        typeUrl: "/fx.gravity.v1.MsgSendToEth",
                        value: MsgSendToEth.encode({
                          amount: msg.value.amount,
                          bridgeFee: msg.value.bridge_fee,
                          ethDest: msg.value.eth_dest,
                          sender: msg.value.sender,
                        }).finish(),
                      },
                    ],
                  },
                  memoConfig.memo,
                  stdFee,
                  {
                    preferNoSetFee: true,
                    preferNoSetMemo: true,
                  },
                  undefined
                );
              } else {
                let chainName = "";
                if (destination === "Binance Smart Chain") {
                  chainName = "bsc";
                } else if (destination === "Polygon") {
                  chainName = "polygon";
                } else if (destination === "Tron") {
                  chainName = "tron";
                } else {
                  console.error("Invalid destination chain");
                  window.close();
                }
                const msg = {
                  type: "crosschain/MsgSendToExternal",
                  value: {
                    sender: accountInfo.bech32Address,
                    dest: recipient,
                    chain_name: chainName,
                    amount: {
                      denom: amountConfig.sendCurrency.coinMinimalDenom,
                      amount: amountDec.truncate().toString(),
                    },
                    bridge_fee: {
                      denom: amountConfig.sendCurrency.coinMinimalDenom,
                      amount: bridgeFeeDec.truncate().toString(),
                    },
                  },
                };
                await accountInfo.cosmos.sendMsgs(
                  "gravityTransfer",
                  {
                    aminoMsgs: [msg],
                    protoMsgs: [
                      {
                        typeUrl: "/fx.crosschain.v1.MsgSendToExternal",
                        value: MsgSendToExternal.encode({
                          amount: msg.value.amount,
                          bridgeFee: msg.value.bridge_fee,
                          dest: msg.value.dest,
                          sender: msg.value.sender,
                          chainName: msg.value.chain_name,
                        }).finish(),
                      },
                    ],
                  },
                  memoConfig.memo,
                  stdFee,
                  {
                    preferNoSetFee: true,
                    preferNoSetMemo: true,
                  },
                  undefined
                );
              }

              history.replace("/");
            } catch (e) {
              history.replace("/");
              notification.push({
                type: "warning",
                placement: "top-center",
                duration: 5,
                content: `Fail to cross chain: ${e.message}`,
                canDelete: true,
                transition: {
                  duration: 0.25,
                },
              });
            }
          }
        }}
      >
        <div className={style.formInnerContainer}>
          <div>
            <FormGroup>
              <Label
                for={`selector-${randomId}`}
                className="form-control-label"
                style={{ width: "100%" }}
              >
                Destination Chain
              </Label>
              <ButtonDropdown
                id={`selector-${randomId}`}
                className={classnames(styleCoinInput.tokenSelector, {
                  disabled: false,
                })}
                isOpen={isOpenSelector}
                toggle={() => setIsOpenSelector((value) => !value)}
              >
                <DropdownToggle caret>{destination}</DropdownToggle>
                <DropdownMenu>
                  {destinations.map((currency) => {
                    return (
                      <DropdownItem
                        key={currency}
                        active={currency === destination}
                        onClick={(e) => {
                          e.preventDefault();

                          setDestination(currency);
                        }}
                      >
                        {currency}
                      </DropdownItem>
                    );
                  })}
                </DropdownMenu>
              </ButtonDropdown>
            </FormGroup>
            <Input
              type="text"
              label="Recipient"
              value={recipient}
              onChange={(e) => {
                e.preventDefault();

                setRecipient(e.target.value);
              }}
            />
            <CoinInput
              amountConfig={amountConfig}
              label={intl.formatMessage({ id: "send.input.amount" })}
              balanceText={intl.formatMessage({
                id: "send.input-button.balance",
              })}
            />
            <Input
              type="number"
              label="Bridge Fee"
              value={bridgeFee}
              onChange={(e) => {
                e.preventDefault();

                setBridgeFee(e.target.value);
              }}
              min={0}
              autoComplete="off"
            />
            <MemoInput
              memoConfig={memoConfig}
              label={intl.formatMessage({ id: "send.input.memo" })}
            />
            <FeeButtons
              feeConfig={feeConfig}
              gasConfig={gasConfig}
              priceStore={priceStore}
              label={intl.formatMessage({ id: "send.input.fee" })}
              feeSelectLabels={{
                low: intl.formatMessage({ id: "fee-buttons.select.low" }),
                average: intl.formatMessage({
                  id: "fee-buttons.select.average",
                }),
                high: intl.formatMessage({ id: "fee-buttons.select.high" }),
              }}
              gasLabel={intl.formatMessage({ id: "send.input.gas" })}
            />
          </div>
          <div style={{ flex: 1 }} />
          <Alert className={style.alert}>
            <i className="fas fa-exclamation-circle" />
            <div>
              <h1>Gravity Bridge is production ready</h1>
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
            data-loading={accountInfo.isSendingMsg === "gravityTransfer"}
            disabled={!accountInfo.isReadyToSendMsgs || !txStateIsValid}
          >
            {intl.formatMessage({
              id: "send.button.send",
            })}
          </Button>
        </div>
      </form>
    </HeaderLayout>
  );
});
