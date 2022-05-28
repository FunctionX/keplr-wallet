import React, { FunctionComponent } from "react";

import { Button } from "reactstrap";

import { observer } from "mobx-react-lite";

import styleStake from "./stake.module.scss";
import classnames from "classnames";

import { FormattedMessage } from "react-intl";
import { useHistory } from "react-router";

export const GravityView: FunctionComponent = observer(() => {
  const history = useHistory();

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
            <FormattedMessage id="main.gravity.message.crosschain" />
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <Button
          className={styleStake.button}
          color="primary"
          size="sm"
          onClick={(e) => {
            e.preventDefault();

            history.push("/gravity");
          }}
        >
          <FormattedMessage id="main.gravity.button.send" />
        </Button>
      </div>
    </div>
  );
});
