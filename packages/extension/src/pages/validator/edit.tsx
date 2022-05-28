import React, { FunctionComponent, useEffect, useState } from "react";

import { HeaderLayout } from "../../layouts";

import { Button } from "reactstrap";

import { observer } from "mobx-react-lite";

import style from "./style.module.scss";

import { useHistory } from "react-router";
import { useStore } from "../../stores";
import { Bech32Address } from "@keplr-wallet/cosmos";
import { FeeButtons, Input, MemoInput } from "../../components/form";
import {
  useAmountConfig,
  useFeeConfig,
  useGasConfig,
  useMemoConfig,
} from "@keplr-wallet/hooks";
import { useIntl } from "react-intl";
import { Staking } from "@keplr-wallet/stores";
import { useNotification } from "../../components/notification";
import { MsgEditValidator } from "@keplr-wallet/proto-types/cosmos/staking/v1beta1/tx";
import { Dec, DecUtils } from "@keplr-wallet/unit";

export const ValidatorEditPage: FunctionComponent = observer(() => {
  const history = useHistory();

  useEffect(() => {
    // Scroll to top on page mounted.
    if (window.scrollTo) {
      window.scrollTo(0, 0);
    }
  }, []);

  const { chainStore, queriesStore, accountStore, priceStore } = useStore();
  const accountInfo = accountStore.getAccount(chainStore.current.chainId);
  const queries = queriesStore.get(chainStore.current.chainId);

  const bondedValidators = queries.cosmos.queryValidators.getQueryStatus(
    Staking.BondStatus.Bonded
  );
  const unbondingValidators = queries.cosmos.queryValidators.getQueryStatus(
    Staking.BondStatus.Unbonding
  );
  const unbondedValidators = queries.cosmos.queryValidators.getQueryStatus(
    Staking.BondStatus.Unbonded
  );

  const validatorAddress = Bech32Address.fromBech32(
    accountInfo.bech32Address
  ).toBech32(chainStore.current.bech32Config.bech32PrefixValAddr);
  // const validator = ;
  // if (validator === undefined) {
  //   throw new Error("Invalid validator");
  // }

  const [validator] = useState(() =>
    bondedValidators.validators
      .concat(unbondingValidators.validators)
      .concat(unbondedValidators.validators)
      .find((val) => val.operator_address === validatorAddress)
  );
  if (validator === undefined) {
    throw new Error("Invalid validator");
  }

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
                  type: "cosmos-sdk/MsgEditValidator",
                  value: {
                    description: {
                      moniker:
                        validator.description.moniker !== ""
                          ? validator.description.moniker
                          : undefined,
                      identity:
                        validator.description.identity !== ""
                          ? validator.description.identity
                          : undefined,
                      website:
                        validator.description.website !== ""
                          ? validator.description.website
                          : undefined,
                      security_contact:
                        validator.description.security_contact !== ""
                          ? validator.description.security_contact
                          : undefined,
                      details:
                        validator.description.details !== ""
                          ? validator.description.details
                          : undefined,
                    },
                    validator_address: validator.operator_address,
                    commission_rate: validator.commission.commission_rates.rate,
                    min_self_delegation: validator.min_self_delegation,
                  },
                },
              ];
              await accountInfo.cosmos.sendMsgs(
                "editValidator",
                {
                  aminoMsgs: msgs,
                  protoMsgs: msgs.map((msg) => {
                    return {
                      typeUrl: "/cosmos.staking.v1beta1.MsgEditValidator",
                      value: MsgEditValidator.encode({
                        description: {
                          moniker: msg.value.description.moniker ?? "",
                          identity: msg.value.description.identity ?? "",
                          website: msg.value.description.website ?? "",
                          securityContact:
                            msg.value.description.security_contact ?? "",
                          details:
                            msg.value.description.details ?? "[do-not-modify]",
                        },
                        validatorAddress: msg.value.validator_address,
                        commissionRate: new Dec(msg.value.commission_rate)
                          .mul(
                            DecUtils.getTenExponentNInPrecisionRange(
                              amountConfig.sendCurrency?.coinDecimals ?? 0
                            )
                          )
                          .toString(0),
                        minSelfDelegation: msg.value.min_self_delegation,
                      }).finish(),
                    };
                  }),
                },
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
                content: `Fail to edit validator: ${e.message}`,
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
              type="text"
              label="ValAddress"
              disabled
              defaultValue={validator.operator_address}
            />
            <Input
              type="text"
              label="Moniker"
              defaultValue={validator.description.moniker}
              onChange={(e) => {
                e.preventDefault();
                validator.description.moniker = e.target.value;
              }}
            />
            <Input
              type="text"
              label="Identity"
              defaultValue={validator.description.identity}
              onChange={(e) => {
                e.preventDefault();
                validator.description.identity = e.target.value;
              }}
            />
            <Input
              type="text"
              label="Website"
              defaultValue={validator.description.website}
              onChange={(e) => {
                e.preventDefault();
                validator.description.website = e.target.value;
              }}
            />
            <Input
              type="text"
              label="Security Contact"
              defaultValue={validator.description.security_contact}
              onChange={(e) => {
                e.preventDefault();
                validator.description.security_contact = e.target.value;
              }}
            />
            <Input
              type="text"
              label="Details"
              defaultValue={validator.description.details}
              onChange={(e) => {
                e.preventDefault();
                validator.description.details = e.target.value;
              }}
            />
            <Input
              type="number"
              label="Commission Rate"
              defaultValue={parseFloat(
                validator.commission.commission_rates.rate
              ).toString()}
              onChange={(e) => {
                e.preventDefault();
                validator.commission.commission_rates.rate = new Dec(
                  e.target.value
                ).toString(amountConfig.sendCurrency?.coinDecimals ?? 0);
              }}
            />
            <Input
              type="number"
              label="Min Self Delegation"
              defaultValue={parseFloat(
                new Dec(validator.min_self_delegation)
                  .quo(
                    DecUtils.getTenExponentNInPrecisionRange(
                      amountConfig.sendCurrency?.coinDecimals ?? 0
                    )
                  )
                  .toString(amountConfig.sendCurrency?.coinDecimals ?? 0)
              )}
              onChange={(e) => {
                e.preventDefault();
                validator.min_self_delegation = new Dec(e.target.value)
                  .mul(
                    DecUtils.getTenExponentNInPrecisionRange(
                      amountConfig.sendCurrency?.coinDecimals ?? 0
                    )
                  )
                  .toString(amountConfig.sendCurrency?.coinDecimals ?? 0);
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
