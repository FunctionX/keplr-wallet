import React, { FunctionComponent } from "react";

import { Button } from "reactstrap";

import { observer } from "mobx-react-lite";

import styleStake from "./stake.module.scss";
import classnames from "classnames";

import { FormattedMessage } from "react-intl";
import { useHistory } from "react-router";
import { useStore } from "../../stores";
import { Dec } from "@keplr-wallet/unit";

export const GovView: FunctionComponent = observer(() => {
  const history = useHistory();
  const { chainStore, accountStore, queriesStore } = useStore();
  const queries = queriesStore.get(chainStore.current.chainId);
  const proposals = queries.cosmos.queryGovernance.proposals.filter((p) => {
    return p.proposalStatus == 2;
  });

  const accountInfo = accountStore.getAccount(chainStore.current.chainId);
  const queryBalances = queries.queryBalances.getQueryBech32Address(
    accountInfo.bech32Address
  );

  const hasAssets =
    queryBalances.balances.find((bal) => bal.balance.toDec().gt(new Dec(0))) !==
    undefined;

  return (
    <div>
      <div className={classnames(styleStake.containerInner, styleStake.stake)}>
        <div className={styleStake.vertical}>
          <p
            className={classnames(
              "h2",
              "my-0",
              "font-weight-normal",
              styleStake.paragraphMain
            )}
          >
            <FormattedMessage id="main.gov.message.proposals" />
          </p>
          <p
            className={classnames(
              "h4",
              "my-0",
              "font-weight-normal",
              styleStake.paragraphSub
            )}
          >
            {proposals.length === 0 ? "No voting proposal" : proposals[0].title}
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <Button
          className={styleStake.button}
          color="primary"
          size="sm"
          disabled={!hasAssets || proposals.length === 0}
          onClick={(e) => {
            e.preventDefault();

            history.push("/vote");
          }}
        >
          <FormattedMessage id="main.gov.button.vote" />
        </Button>
      </div>
    </div>
  );
});
