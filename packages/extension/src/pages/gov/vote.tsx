import React, { FunctionComponent, useEffect, useState } from "react";

import { HeaderLayout } from "../../layouts";

import { Button } from "reactstrap";

import { observer } from "mobx-react-lite";

import style from "./style.module.scss";

import { useHistory } from "react-router";
import { useStore } from "../../stores";
import { FeeButtons, Input, MemoInput } from "../../components/form";
import {
  useAmountConfig,
  useFeeConfig,
  useGasConfig,
  useMemoConfig,
} from "@keplr-wallet/hooks";
import { useIntl } from "react-intl";
import { useNotification } from "../../components/notification";

export const VotePage: FunctionComponent = observer(() => {
  const history = useHistory();
  const intl = useIntl();

  useEffect(() => {
    // Scroll to top on page mounted.
    if (window.scrollTo) {
      window.scrollTo(0, 0);
    }
  }, []);

  const { chainStore, queriesStore, accountStore, priceStore } = useStore();
  const accountInfo = accountStore.getAccount(chainStore.current.chainId);
  const queries = queriesStore.get(chainStore.current.chainId);
  const proposals = queries.cosmos.queryGovernance.proposals.filter((p) => {
    return p.proposalStatus == 2;
  });

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
  const options = ["Yes", "No", "NoWithVeto", "Abstain"];
  const [vote, setVote] = useState<"Yes" | "No" | "NoWithVeto" | "Abstain">(
    "Yes"
  );
  const [proposalIdx] = useState(0);

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
              await accountInfo.cosmos.sendGovVoteMsg(
                proposals[proposalIdx].id,
                vote,
                memoConfig.memo,
                stdFee,
                {
                  preferNoSetFee: true,
                  preferNoSetMemo: true,
                  disableBalanceCheck: true,
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
                content: `Fail to proposal vote: ${e.message}`,
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
              label="Proposal"
              defaultValue={proposalIdx}
              options={proposals.reduce((pre, cur) => {
                return pre.concat(`#${cur.id} ${cur.title}}`);
              }, [] as string[])}
            />
            <Input
              type="select"
              label="Option"
              options={options}
              onChange={(e) => {
                e.preventDefault();
                switch (e.target.value) {
                  case "0":
                    setVote("Yes");
                    break;
                  case "1":
                    setVote("No");
                    break;
                  case "2":
                    setVote("NoWithVeto");
                    break;
                  case "3":
                    setVote("Abstain");
                    break;
                }
              }}
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
