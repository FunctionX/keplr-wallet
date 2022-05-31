import React, { FunctionComponent, useEffect, useMemo, useState } from "react";

import { HeaderLayout } from "../../layouts";

import {
  Button,
  ButtonDropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  FormFeedback,
  FormGroup,
  Label,
  Input,
} from "reactstrap";

import { observer } from "mobx-react-lite";

import style from "./style.module.scss";

import { useHistory } from "react-router";
import { useStore } from "../../stores";
import { FeeButtons, MemoInput } from "../../components/form";
import {
  EmptyAmountError,
  InsufficientAmountError,
  InvalidNumberAmountError,
  NegativeAmountError,
  useAmountConfig,
  useFeeConfig,
  useGasConfig,
  useMemoConfig,
  ZeroAmountError,
} from "@keplr-wallet/hooks";
import { useIntl } from "react-intl";
import { Staking } from "@keplr-wallet/stores";
import { useNotification } from "../../components/notification";
import classnames from "classnames";
import styleCoinInput from "../../components/form/coin-input.module.scss";
import { Address } from "../../components/address";

export const StakingPage: FunctionComponent = observer(() => {
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

  const validators = bondedValidators.validators
    .concat(unbondingValidators.validators)
    .concat(unbondedValidators.validators);

  const balance = queriesStore
    .get(chainStore.current.chainId)
    .queryBalances.getQueryBech32Address(accountInfo.bech32Address)
    .getBalanceFromCurrency(chainStore.current.stakeCurrency);

  const intl = useIntl();

  const notification = useNotification();

  const memoConfig = useMemoConfig(chainStore, chainStore.current.chainId);
  const gasConfig = useGasConfig(
    chainStore,
    chainStore.current.chainId,
    120000
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

  const options = ["Delegate", "Undelegate" /*, "Redelegate"*/];
  const [option, setOption] = useState("Delegate");
  const [isOpenOptionSelector, setIsOpenOptionSelector] = useState(false);

  const [validator, setValidator] = useState(
    validators.length > 0
      ? validators[0]
      : { operator_address: "", description: { moniker: undefined } }
  );
  const [isOpenValidatorSelector, setIsOpenValidatorSelector] = useState(false);

  const [randomId] = useState(() => {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    return Buffer.from(bytes).toString("hex");
  });

  const error = amountConfig.error;
  const errorText: string | undefined = useMemo(() => {
    if (error) {
      switch (error.constructor) {
        case EmptyAmountError:
          // No need to show the error to user.
          return;
        case InvalidNumberAmountError:
          return intl.formatMessage({
            id: "input.amount.error.invalid-number",
          });
        case ZeroAmountError:
          return intl.formatMessage({
            id: "input.amount.error.is-zero",
          });
        case NegativeAmountError:
          return intl.formatMessage({
            id: "input.amount.error.is-negative",
          });
        case InsufficientAmountError:
          return intl.formatMessage({
            id: "input.amount.error.insufficient",
          });
        default:
          return intl.formatMessage({ id: "input.amount.error.unknown" });
      }
    }
  }, [intl, error]);

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
              switch (option) {
                case "Delegate":
                  await accountInfo.cosmos.sendDelegateMsg(
                    amountConfig.amount,
                    validator.operator_address,
                    memoConfig.memo,
                    stdFee,
                    {
                      preferNoSetFee: true,
                      preferNoSetMemo: true,
                    },
                    undefined
                  );
                  break;
                case "Undelegate":
                  await accountInfo.cosmos.sendUndelegateMsg(
                    amountConfig.amount,
                    validator?.operator_address,
                    memoConfig.memo,
                    stdFee,
                    {
                      preferNoSetFee: true,
                      preferNoSetMemo: true,
                    },
                    undefined
                  );
                  break;
              }

              history.replace("/");
            } catch (e) {
              history.replace("/");
              notification.push({
                type: "warning",
                placement: "top-center",
                duration: 5,
                content: `Fail to staking: ${e.message}`,
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
            <React.Fragment>
              <FormGroup>
                <Label
                  for={`selector-${randomId}`}
                  className="form-control-label"
                  style={{ width: "100%" }}
                >
                  Operation
                </Label>
                <ButtonDropdown
                  id={`selector-${randomId}`}
                  className={classnames(styleCoinInput.tokenSelector, {
                    disabled: false,
                  })}
                  isOpen={isOpenOptionSelector}
                  toggle={() => setIsOpenOptionSelector((value) => !value)}
                >
                  <DropdownToggle caret>{option}</DropdownToggle>
                  <DropdownMenu>
                    {options.map((currency) => {
                      return (
                        <DropdownItem
                          key={currency}
                          active={currency === option}
                          onClick={(e) => {
                            e.preventDefault();

                            setOption(currency);
                          }}
                        >
                          {currency}
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
                  Validator
                  <div className={classnames(styleCoinInput.balance)}>
                    <Address maxCharacters={32} lineBreakBeforePrefix={false}>
                      {validator.operator_address}
                    </Address>
                  </div>
                </Label>
                <ButtonDropdown
                  id={`selector-${randomId}`}
                  className={classnames(styleCoinInput.tokenSelector, {
                    disabled: false,
                  })}
                  isOpen={isOpenValidatorSelector}
                  toggle={() => setIsOpenValidatorSelector((value) => !value)}
                >
                  <DropdownToggle caret>
                    {validator.description.moniker}
                  </DropdownToggle>
                  <DropdownMenu>
                    {validators.map((currency) => {
                      return (
                        <DropdownItem
                          key={currency.operator_address}
                          active={
                            currency.operator_address ===
                            validator.operator_address
                          }
                          onClick={(e) => {
                            e.preventDefault();

                            setValidator(currency);
                          }}
                        >
                          {currency.description.moniker}
                        </DropdownItem>
                      );
                    })}
                  </DropdownMenu>
                </ButtonDropdown>
              </FormGroup>
              <FormGroup>
                <Label
                  for={`input-${randomId}`}
                  className="form-control-label"
                  style={{ width: "100%" }}
                >
                  Amount
                  <div
                    className={classnames(
                      styleCoinInput.balance,
                      styleCoinInput.clickable,
                      {
                        [styleCoinInput.clicked]: amountConfig.isMax,
                      }
                    )}
                    onClick={(e) => {
                      e.preventDefault();

                      amountConfig.toggleIsMax();
                    }}
                  >
                    {`Balance: ${balance.trim(true).maxDecimals(6).toString()}`}
                  </div>
                </Label>
                <Input
                  className={classnames(
                    "form-control-alternative",
                    styleCoinInput.input
                  )}
                  id={`input-${randomId}`}
                  type="number"
                  value={amountConfig.amount}
                  onChange={(e) => {
                    e.preventDefault();

                    amountConfig.setAmount(e.target.value);
                  }}
                  min={0}
                  autoComplete="off"
                />
                {errorText != null ? (
                  <FormFeedback style={{ display: "block" }}>
                    {errorText}
                  </FormFeedback>
                ) : null}
              </FormGroup>
            </React.Fragment>
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
            data-loading={
              accountInfo.isSendingMsg === "delegate" ||
              accountInfo.isSendingMsg === "undelegate"
            }
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
