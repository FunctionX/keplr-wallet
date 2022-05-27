import React, { FunctionComponent, useEffect } from "react";

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
  const validator = bondedValidators.validators
    .concat(unbondingValidators.validators)
    .concat(unbondedValidators.validators)
    .find((val) => val.operator_address === validatorAddress);
  if (validator === undefined) {
    history.goBack();
    return <div />;
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
                        validator.description?.moniker ?? "[do-not-modify]",
                      identity:
                        validator.description?.identity ?? "[do-not-modify]",
                      website:
                        validator.description?.website ?? "[do-not-modify]",
                      security_contact:
                        validator.description?.security_contact ??
                        "[do-not-modify]",
                      details:
                        validator.description?.details ?? "[do-not-modify]",
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
                          moniker:
                            msg.value.description?.moniker ?? "[do-not-modify]",
                          identity:
                            msg.value.description?.identity ??
                            "[do-not-modify]",
                          website:
                            msg.value.description?.website ?? "[do-not-modify]",
                          securityContact:
                            msg.value.description?.security_contact ??
                            "[do-not-modify]",
                          details:
                            msg.value.description?.details ?? "[do-not-modify]",
                        },
                        validatorAddress: msg.value.validator_address,
                        commissionRate: msg.value.commission_rate,
                        minSelfDelegation: msg.value.min_self_delegation,
                      }).finish(),
                    };
                  }),
                },
                memoConfig.memo,
                stdFee,
                undefined,
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
              label="valAddress"
              disabled
              value={validator.operator_address}
            />
            <Input
              type="text"
              label="moniker"
              value={validator.description.moniker}
            />
            <Input
              type="text"
              label="identity"
              value={validator.description.identity}
            />
            <Input
              type="text"
              label="website"
              value={validator.description.website}
            />
            <Input
              type="text"
              label="security"
              value={validator.description.security_contact}
            />
            <Input
              type="text"
              label="details"
              value={validator.description.details}
            />
            <Input
              type="number"
              label="commissionRate"
              value={validator.commission.commission_rates.rate}
            />
            <Input
              type="number"
              label="minSelfDelegation"
              value={validator.min_self_delegation}
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
