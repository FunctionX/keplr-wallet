import React, { FunctionComponent, useEffect, useMemo, useState } from "react";

import { HeaderLayout } from "../../layouts";

import { Col, ListGroup, ListGroupItem, Row } from "reactstrap";

import { observer } from "mobx-react-lite";

import style from "./style.module.scss";

import { useHistory } from "react-router";
import { useStore } from "../../stores";
import { CoinPretty, Dec } from "@keplr-wallet/unit";

type Sort = "APY" | "Voting Power" | "Name";

export const ValidatorListPage: FunctionComponent = observer(() => {
  const history = useHistory();

  useEffect(() => {
    // Scroll to top on page mounted.
    if (window.scrollTo) {
      window.scrollTo(0, 0);
    }
  }, []);

  const { chainStore, queriesStore } = useStore();
  const queries = queriesStore.get(chainStore.current.chainId);
  const bondedValidators = queries.cosmos.queryValidators.getQueryStatus();

  const [sort] = useState<Sort>("Voting Power");

  const data = useMemo(() => {
    const data = bondedValidators.validators;
    switch (sort) {
      case "APY":
        data.sort((val1, val2) => {
          return new Dec(val1.commission.commission_rates.rate).gt(
            new Dec(val2.commission.commission_rates.rate)
          )
            ? 1
            : -1;
        });
        break;
      case "Name":
        data.sort((val1, val2) => {
          if (!val1.description.moniker) {
            return 1;
          }
          if (!val2.description.moniker) {
            return -1;
          }
          return val1.description.moniker > val2.description.moniker ? -1 : 1;
        });
        break;
      case "Voting Power":
        data.sort((val1, val2) => {
          return new Dec(val1.tokens).gt(new Dec(val2.tokens)) ? -1 : 1;
        });
        break;
    }

    return data;
  }, [bondedValidators.validators, sort]);

  // const items = useMemo(() => {
  //   return [
  //     { label: "APY", key: "APY" },
  //     { label: "Amount Staked", key: "Voting Power" },
  //     { label: "Name", key: "Name" },
  //   ];
  // }, []);
  //
  // const sortItem = useMemo(() => {
  //   const item = items.find((item) => item.key === sort);
  //   if (!item) {
  //     throw new Error(`Can't find the item for sort (${sort})`);
  //   }
  //   return item;
  // }, [items, sort]);

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
      <div className={style.formInnerContainer}>
        <ListGroup>
          {data.map((validator, index) => {
            return (
              <ListGroupItem key={index}>
                <a>
                  <Row>
                    <Col xs="1">{index + 1}</Col>
                    <Col xs="5" className="text-break">
                      <h5>{validator.description.moniker}</h5>
                    </Col>
                    <Col xs="5">
                      <span>APR </span>
                      {queries.cosmos.queryInflation.inflation
                        .mul(
                          new Dec(1).sub(
                            new Dec(validator.commission.commission_rates.rate)
                          )
                        )
                        .maxDecimals(2)
                        .trim(true)
                        .toString() + "%"}
                    </Col>
                    <Col xs="12">
                      <span>Total Staked </span>
                      {new CoinPretty(
                        chainStore.current.stakeCurrency,
                        new Dec(validator.tokens)
                      )
                        .maxDecimals(0)
                        .hideDenom(true)
                        .toString()}
                    </Col>
                  </Row>
                </a>
              </ListGroupItem>
            );
          })}
        </ListGroup>
      </div>
    </HeaderLayout>
  );
});
