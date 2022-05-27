import React, { FunctionComponent } from "react";

import { Button } from "reactstrap";

import { observer } from "mobx-react-lite";

import styleStake from "./stake.module.scss";
import classnames from "classnames";

import { FormattedMessage } from "react-intl";
import { useHistory } from "react-router";

export const GovView: FunctionComponent = observer(() => {
  const history = useHistory();
  // const { chainStore, accountStore, queriesStore, analyticsStore } = useStore();
  // const accountInfo = accountStore.getAccount(chainStore.current.chainId);
  // const queries = queriesStore.get(chainStore.current.chainId);

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
        </div>
        <div style={{ flex: 1 }} />
        <Button
          className={styleStake.button}
          color="primary"
          size="sm"
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
