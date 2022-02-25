import React, { FunctionComponent } from "react";

import classmames from "classnames";
import style from "./style.module.scss";

interface Props {
  icon: string;
  subtitle: string;
}

export const Banner: FunctionComponent<Props> = ({ icon, subtitle }) => {
  return (
    <div className={classmames(style.container, style.flexVertical)}>
      <div className={style.empty} />
      <div className={style.flexHorizontal}>
        <div className={style.empty} />
        <div className={style.flexVertical}>
          <img className={style.icon} src={icon} />
          <div className={style.subtitle}>{subtitle}</div>
        </div>
        <div className={style.empty} />
      </div>
      <div className={style.empty} />
    </div>
  );
};
