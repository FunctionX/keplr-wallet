import React, { FunctionComponent } from "react";

import { Button } from "reactstrap";

import { observer } from "mobx-react-lite";

import styleStake from "./stake.module.scss";
import classnames from "classnames";

import { FormattedMessage } from "react-intl";
import { useHistory } from "react-router";
import { Dec } from "@keplr-wallet/unit";
import { useStore } from "../../stores";

export const GravityView: FunctionComponent = observer(() => {
  const history = useHistory();

  const { chainStore, accountStore, queriesStore } = useStore();

  const accountInfo = accountStore.getAccount(chainStore.current.chainId);
  const queries = queriesStore.get(chainStore.current.chainId);
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
            <FormattedMessage id="main.gravity.transfer.title" />
          </p>
          <p
            className={classnames(
              "h4",
              "my-0",
              "font-weight-normal",
              styleStake.paragraphSub
            )}
          >
            <FormattedMessage id="main.gravity.transfer.paragraph" />
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <Button
          className={styleStake.button}
          color="primary"
          size="sm"
          disabled={!hasAssets}
          data-loading={accountInfo.isSendingMsg === "gravityTransfer"}
          onClick={(e) => {
            e.preventDefault();

            history.push("/gravity");
          }}
        >
          <FormattedMessage id="main.gravity.transfer.button" />
        </Button>
      </div>
    </div>
  );
});
