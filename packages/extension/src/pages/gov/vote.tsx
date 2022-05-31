import React, { FunctionComponent, useEffect, useState } from "react";

import { HeaderLayout } from "../../layouts";

import {
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
import { FeeButtons, MemoInput } from "../../components/form";
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
import { Address } from "../../components/address";

type Vote = "Yes" | "No" | "NoWithVeto" | "Abstain";

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
  const [vote, setVote] = useState<Vote>("Yes");
  const [isOpenVoteSelector, setIsOpenVoteSelector] = useState(false);

  const [proposal, setProposal] = useState(
    proposals.length > 0 ? proposals[0] : { id: "", title: "" }
  );
  const [isOpenProposalSelector, setIsOpenProposalSelector] = useState(false);

  const [randomId] = useState(() => {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    return Buffer.from(bytes).toString("hex");
  });

  const configError = memoConfig.error ?? gasConfig.error ?? feeConfig.error;
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
              await accountInfo.cosmos.sendGovVoteMsg(
                proposal.id,
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
            <FormGroup>
              <Label
                for={`selector-${randomId}`}
                className="form-control-label"
                style={{ width: "100%" }}
              >
                Proposal
                <div className={classnames(styleCoinInput.balance)}>
                  <Address maxCharacters={32} lineBreakBeforePrefix={false}>
                    {proposal.title}
                  </Address>
                </div>
              </Label>
              <ButtonDropdown
                id={`selector-${randomId}`}
                className={classnames(styleCoinInput.tokenSelector, {
                  disabled: false,
                })}
                isOpen={isOpenProposalSelector}
                toggle={() => setIsOpenProposalSelector((value) => !value)}
                disabled={proposals.length === 0}
              >
                <DropdownToggle caret>
                  {proposal.id !== "" ? `#${proposal.id}` : ""}
                </DropdownToggle>
                <DropdownMenu>
                  {proposals.map((currency) => {
                    return (
                      <DropdownItem
                        key={currency.id}
                        active={currency.id === proposal.id}
                        onClick={(e) => {
                          e.preventDefault();

                          setProposal(currency);
                        }}
                      >
                        #{currency.id}
                      </DropdownItem>
                    );
                  })}
                </DropdownMenu>
              </ButtonDropdown>
            </FormGroup>
            <FormGroup>
              <Label
                for={`selector-${randomId}`}
                className="form-control-label"
                style={{ width: "100%" }}
              >
                Option
              </Label>
              <ButtonDropdown
                id={`selector-${randomId}`}
                className={classnames(styleCoinInput.tokenSelector, {
                  disabled: false,
                })}
                isOpen={isOpenVoteSelector}
                toggle={() => setIsOpenVoteSelector((value) => !value)}
              >
                <DropdownToggle caret>{vote}</DropdownToggle>
                <DropdownMenu>
                  {options.map((currency) => {
                    return (
                      <DropdownItem
                        key={currency}
                        active={currency === vote.toString()}
                        onClick={(e) => {
                          e.preventDefault();

                          setVote(currency as Vote);
                        }}
                      >
                        {currency}
                      </DropdownItem>
                    );
                  })}
                </DropdownMenu>
              </ButtonDropdown>
            </FormGroup>
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
            data-loading={accountInfo.isSendingMsg === "govVote"}
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
