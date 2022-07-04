import React, { FunctionComponent, useMemo, useRef, useState } from "react";

import { Button, Tooltip } from "reactstrap";

import { useStore } from "../../stores";

import { observer } from "mobx-react-lite";

import styleStake from "./stake.module.scss";
import classnames from "classnames";
import { CoinPretty, Dec, Int } from "@keplr-wallet/unit";

import { useNotification } from "../../components/notification";

import { useHistory } from "react-router";

import { FormattedMessage } from "react-intl";
import { Bech32Address } from "@keplr-wallet/cosmos";
import { Staking } from "@keplr-wallet/stores";
import {
  MsgWithdrawDelegatorReward,
  MsgWithdrawValidatorCommission,
} from "@keplr-wallet/proto-types/cosmos/distribution/v1beta1/tx";
import {
  useAmountConfig,
  useFeeConfig,
  useGasConfig,
} from "@keplr-wallet/hooks";

export const StakeView: FunctionComponent = observer(() => {
  const history = useHistory();
  const { chainStore, accountStore, queriesStore, analyticsStore } = useStore();
  const accountInfo = accountStore.getAccount(chainStore.current.chainId);
  const queries = queriesStore.get(chainStore.current.chainId);

  const notification = useNotification();

  const inflation = queries.cosmos.queryInflation;
  const rewards = queries.cosmos.queryRewards.getQueryBech32Address(
    accountInfo.bech32Address
  );
  const chainInfo = chainStore.getChain(chainStore.current.chainId);
  const rewardDenom = chainInfo.rewardCurrency
    ? chainInfo.rewardCurrency.coinMinimalDenom
    : chainInfo.stakeCurrency.coinMinimalDenom;
  const stakableReward =
    rewards.rewards.find((v) => {
      return v.currency.coinMinimalDenom === rewardDenom;
    }) ?? new CoinPretty(chainInfo.stakeCurrency, new Int(0)).ready(false);

  const stakable = queries.queryBalances.getQueryBech32Address(
    accountInfo.bech32Address
  ).stakable;

  const isRewardExist = rewards.rewards.length > 0;

  const isStakableExist = useMemo(() => {
    return stakable.balance.toDec().gt(new Dec(0));
  }, [stakable.balance]);

  let validator = undefined;
  let validatorAddress = "";
  let commissionReward = "0";
  if (accountInfo.bech32Address) {
    const bondedValidators = queries.cosmos.queryValidators.getQueryStatus(
      Staking.BondStatus.Bonded
    );
    const unbondingValidators = queries.cosmos.queryValidators.getQueryStatus(
      Staking.BondStatus.Unbonding
    );
    const unbondedValidators = queries.cosmos.queryValidators.getQueryStatus(
      Staking.BondStatus.Unbonded
    );
    validatorAddress = Bech32Address.fromBech32(
      accountInfo.bech32Address
    ).toBech32(chainStore.current.bech32Config.bech32PrefixValAddr);
    validator = bondedValidators.validators
      .concat(unbondingValidators.validators)
      .concat(unbondedValidators.validators)
      .find((val) => val.operator_address === validatorAddress);
    commissionReward =
      queries.cosmos.queryDistribution
        .getQueryValAddress(validatorAddress)
        .commissionRewards.find((v) => {
          return v.denom === rewardDenom;
        })?.amount ?? "0";
  }

  const gasConfig = useGasConfig(
    chainStore,
    chainStore.current.chainId,
    150000
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

  const withdrawAllRewards = async () => {
    if (accountInfo.isReadyToSendMsgs) {
      try {
        // When the user delegated too many validators,
        // it can't be sent to withdraw rewards from all validators due to the block gas limit.
        // So, to prevent this problem, just send the msgs up to 8.
        await accountInfo.cosmos.sendWithdrawDelegationRewardMsgs(
          rewards.getDescendingPendingRewardValidatorAddresses(8),
          "",
          undefined,
          {
            preferNoSetFee: false,
            preferNoSetMemo: false,
            disableBalanceCheck: false,
          },
          {
            onBroadcasted: () => {
              analyticsStore.logEvent("Claim reward tx broadcasted", {
                chainId: chainStore.current.chainId,
                chainName: chainStore.current.chainName,
              });
            },
          }
        );

        history.replace("/");
      } catch (e) {
        history.replace("/");
        notification.push({
          type: "warning",
          placement: "top-center",
          duration: 5,
          content: `Fail to withdraw rewards: ${e.message}`,
          canDelete: true,
          transition: {
            duration: 0.25,
          },
        });
      }
    }
  };

  const withdrawValCommission = async () => {
    if (accountInfo.isReadyToSendMsgs) {
      try {
        // When the user delegated too many validators,
        // it can't be sent to withdraw rewards from all validators due to the block gas limit.
        // So, to prevent this problem, just send the msgs up to 8.
        const msgs = [
          {
            type: "cosmos-sdk/MsgWithdrawDelegationReward",
            value: {
              delegator_address: accountInfo.bech32Address,
              validator_address: validatorAddress,
            },
          },
          {
            type: "cosmos-sdk/MsgWithdrawValidatorCommission",
            value: {
              validator_address: validatorAddress,
            },
          },
        ];
        await accountInfo.cosmos.sendMsgs(
          "withdrawValidatorCommission",
          {
            aminoMsgs: msgs,
            protoMsgs: msgs.map((msg) => {
              if (msg.type === "cosmos-sdk/MsgWithdrawValidatorCommission") {
                return {
                  typeUrl:
                    "/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission",
                  value: MsgWithdrawValidatorCommission.encode({
                    validatorAddress: msg.value.validator_address,
                  }).finish(),
                };
              } else {
                return {
                  typeUrl:
                    "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
                  value: MsgWithdrawDelegatorReward.encode({
                    delegatorAddress: msg.value.delegator_address ?? "",
                    validatorAddress: msg.value.validator_address,
                  }).finish(),
                };
              }
            }),
          },
          "",
          feeConfig.toStdFee(),
          {
            preferNoSetFee: false,
            preferNoSetMemo: false,
            disableBalanceCheck: false,
          },
          undefined
        );

        history.replace("/");
      } catch (e) {
        history.replace("/");
        console.log(e);
        notification.push({
          type: "warning",
          placement: "top-center",
          duration: 5,
          content: `Fail to withdraw commission rewards: ${e.message}`,
          canDelete: true,
          transition: {
            duration: 0.25,
          },
        });
      }
    }
  };

  const [tooltipOpen, setTooltipOpen] = useState(false);
  const toogleTooltip = () => setTooltipOpen((value) => !value);

  const stakeBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <div>
      {isRewardExist ? (
        <>
          <div
            className={classnames(styleStake.containerInner, styleStake.reward)}
          >
            <div className={styleStake.vertical}>
              <p
                className={classnames(
                  "h4",
                  "my-0",
                  "font-weight-normal",
                  styleStake.paragraphSub
                )}
              >
                <FormattedMessage id="main.stake.message.pending-staking-reward" />
              </p>
              <p
                className={classnames(
                  "h2",
                  "my-0",
                  "font-weight-normal",
                  styleStake.paragraphMain
                )}
              >
                {stakableReward.shrink(true).maxDecimals(6).toString()}
                {rewards.isFetching ? (
                  <span>
                    <i className="fas fa-spinner fa-spin" />
                  </span>
                ) : null}
              </p>
            </div>
            <div style={{ flex: 1 }} />
            {
              <Button
                className={styleStake.button}
                color="primary"
                size="sm"
                disabled={!accountInfo.isReadyToSendMsgs}
                onClick={withdrawAllRewards}
                data-loading={accountInfo.isSendingMsg === "withdrawRewards"}
              >
                <FormattedMessage id="main.stake.button.claim-rewards" />
              </Button>
            }
          </div>
          <hr className={styleStake.hr} />
        </>
      ) : null}

      {validator ? (
        <>
          <div
            className={classnames(styleStake.containerInner, styleStake.reward)}
          >
            <div className={styleStake.vertical}>
              <p
                className={classnames(
                  "h4",
                  "my-0",
                  "font-weight-normal",
                  styleStake.paragraphSub
                )}
              >
                <FormattedMessage id="main.stake.message.pending-commission-reward" />
              </p>
              <p
                className={classnames(
                  "h2",
                  "my-0",
                  "font-weight-normal",
                  styleStake.paragraphMain
                )}
              >
                {new CoinPretty(
                  chainStore.current.stakeCurrency,
                  new Dec(commissionReward)
                )
                  .maxDecimals(0)
                  .hideDenom(true)
                  .toString()}
                {/*{rewards.isFetching ? (*/}
                {/*  <span>*/}
                {/*    <i className="fas fa-spinner fa-spin" />*/}
                {/*  </span>*/}
                {/*) : null}*/}
              </p>
            </div>
            <div style={{ flex: 1 }} />
            {
              <Button
                className={styleStake.button}
                color="primary"
                size="sm"
                disabled={!accountInfo.isReadyToSendMsgs}
                onClick={withdrawValCommission}
                data-loading={
                  accountInfo.isSendingMsg === "withdrawValidatorCommission"
                }
              >
                <FormattedMessage id="main.stake.button.commission-rewards" />
              </Button>
            }
          </div>
          <hr className={styleStake.hr} />
        </>
      ) : null}

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
            <FormattedMessage id="main.stake.message.stake" />
          </p>
          {inflation.inflation.toDec().equals(new Dec(0)) ? null : (
            <p
              className={classnames(
                "h4",
                "my-0",
                "font-weight-normal",
                styleStake.paragraphSub
              )}
            >
              <FormattedMessage
                id="main.stake.message.earning"
                values={{
                  apr: (
                    <React.Fragment>
                      {inflation.inflation.trim(true).maxDecimals(2).toString()}
                      {inflation.isFetching ? (
                        <span>
                          <i className="fas fa-spinner fa-spin" />
                        </span>
                      ) : null}
                    </React.Fragment>
                  ),
                }}
              />
            </p>
          )}
        </div>
        <div style={{ flex: 1 }} />
        {/*<a*/}
        {/*  href={chainStore.current.walletUrlForStaking}*/}
        {/*  target="_blank"*/}
        {/*  rel="noopener noreferrer"*/}
        {/*  onClick={(e) => {*/}
        {/*    if (!isStakableExist) {*/}
        {/*      e.preventDefault();*/}
        {/*    } else {*/}
        {/*      analyticsStore.logEvent("Stake button clicked", {*/}
        {/*        chainId: chainStore.current.chainId,*/}
        {/*        chainName: chainStore.current.chainName,*/}
        {/*      });*/}
        {/*    }*/}
        {/*  }}*/}
        {/*>*/}
        {/*
            "Disabled" property in button tag will block the mouse enter/leave events.
            So, tooltip will not work as expected.
            To solve this problem, don't add "disabled" property to button tag and just add "disabled" class manually.
          */}
        <Button
          // innerRef={stakeBtnRef}
          className={classnames(styleStake.button, {
            disabled: !isStakableExist,
          })}
          color="primary"
          size="sm"
          // outline={isRewardExist}
          data-loading={
            accountInfo.isSendingMsg === "delegate" ||
            accountInfo.isSendingMsg === "undelegate"
          }
          onClick={(e) => {
            e.preventDefault();

            if (isStakableExist) {
              history.push("/staking");
            }
          }}
        >
          <FormattedMessage id="main.stake.button.stake" />
        </Button>
        {!isStakableExist ? (
          <Tooltip
            placement="bottom"
            isOpen={tooltipOpen}
            target={stakeBtnRef}
            toggle={toogleTooltip}
            fade
          >
            <FormattedMessage id="main.stake.tooltip.no-asset" />
          </Tooltip>
        ) : null}
        {/*</a>*/}
      </div>
    </div>
  );
});
