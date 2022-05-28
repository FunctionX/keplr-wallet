import React, { FunctionComponent, useEffect } from "react";

import { HeaderLayout } from "../../layouts";

import { Button } from "reactstrap";

import { observer } from "mobx-react-lite";

import style from "./style.module.scss";

import { useHistory } from "react-router";
import { useStore } from "../../stores";
import {
  AddressInput,
  CoinInput,
  FeeButtons,
  Input,
  MemoInput,
} from "../../components/form";
import {
  useAmountConfig,
  useFeeConfig,
  useGasConfig,
  useMemoConfig,
  useRecipientConfig,
} from "@keplr-wallet/hooks";
import { useIntl } from "react-intl";
import { useNotification } from "../../components/notification";
import { EthereumEndpoint } from "../../config.ui";

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
  // const queries = queriesStore.get(chainStore.current.chainId);

  const intl = useIntl();

  const notification = useNotification();

  const current = chainStore.current;

  const memoConfig = useMemoConfig(chainStore, current.chainId);
  const gasConfig = useGasConfig(chainStore, current.chainId, 120000);
  const amountConfig = useAmountConfig(
    chainStore,
    queriesStore,
    current.chainId,
    accountInfo.bech32Address
  );
  const feeConfig = useFeeConfig(
    chainStore,
    queriesStore,
    current.chainId,
    accountInfo.bech32Address,
    amountConfig,
    gasConfig
  );
  const recipientConfig = useRecipientConfig(
    chainStore,
    current.chainId,
    EthereumEndpoint
  );

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
              const msgs = [
                {
                  type: "",
                  value: {},
                },
              ];
              await accountInfo.cosmos.sendMsgs(
                "",
                {
                  aminoMsgs: msgs,
                  protoMsgs: msgs.map(() => {
                    return {
                      typeUrl: "",
                      value: new Uint8Array(),
                    };
                  }),
                },
                memoConfig.memo,
                stdFee,
                {
                  preferNoSetFee: true,
                  preferNoSetMemo: true,
                },
                undefined
              );

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
            <Input
              type="select"
              label="Destination Chain"
              defaultValue={"Ethereum"}
              options={["Ethereum", "Binance Smart Chain", "Polygon", "Tron"]}
            />
            <AddressInput
              recipientConfig={recipientConfig}
              memoConfig={memoConfig}
              label={intl.formatMessage({ id: "send.input.recipient" })}
            />
            <CoinInput
              amountConfig={amountConfig}
              label={intl.formatMessage({ id: "send.input.amount" })}
              balanceText={intl.formatMessage({
                id: "send.input-button.balance",
              })}
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
          <Button
            type="submit"
            color="primary"
            block
            data-loading={accountInfo.isSendingMsg === "send"}
            disabled={!accountInfo.isReadyToSendMsgs}
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
