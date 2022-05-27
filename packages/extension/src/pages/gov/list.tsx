import React, { FunctionComponent, useEffect, useState } from "react";

import { HeaderLayout } from "../../layouts";

import { observer } from "mobx-react-lite";

import style from "./style.module.scss";

import { useHistory } from "react-router";
import { Col, ListGroup, ListGroupItem, Row } from "reactstrap";
import { useStore } from "../../stores";
import { Governance, ObservableQueryProposal } from "@keplr-wallet/stores";
import { IntlShape, useIntl } from "react-intl";

export const ProposalsListPage: FunctionComponent = observer(() => {
  const history = useHistory();
  const intl = useIntl();

  useEffect(() => {
    // Scroll to top on page mounted.
    if (window.scrollTo) {
      window.scrollTo(0, 0);
    }
  }, []);

  const { chainStore, queriesStore } = useStore();
  const queries = queriesStore.get(chainStore.current.chainId);
  const proposals = queries.cosmos.queryGovernance.proposals;

  const renderProposalDateString = (proposal: ObservableQueryProposal) => {
    switch (proposal.proposalStatus) {
      case Governance.ProposalStatus.DEPOSIT_PERIOD:
        return `Voting ends: ${dateToLocalString(
          intl,
          proposal.raw.deposit_end_time
        )}`;
      case Governance.ProposalStatus.VOTING_PERIOD:
      case Governance.ProposalStatus.FAILED:
      case Governance.ProposalStatus.PASSED:
      case Governance.ProposalStatus.REJECTED:
      case Governance.ProposalStatus.UNSPECIFIED:
        return `Voting ends: ${dateToLocalString(
          intl,
          proposal.raw.voting_end_time
        )}`;
    }
  };

  const [current] = useState(() => new Date().getTime());

  // Relative time is not between the end time and actual current time.
  // Relative time is between the end time and "the time that the component is mounted."
  const proposalRelativeEndTimeString = (proposal: ObservableQueryProposal) => {
    switch (proposal.proposalStatus) {
      case Governance.ProposalStatus.DEPOSIT_PERIOD:
        const relativeDepositEndTime =
          (new Date(proposal.raw.deposit_end_time).getTime() - current) / 1000;
        const relativeDepositEndTimeDays = Math.floor(
          relativeDepositEndTime / (3600 * 24)
        );
        const relativeDepositEndTimeHours = Math.ceil(
          relativeDepositEndTime / 3600
        );

        if (relativeDepositEndTimeDays) {
          return (
            intl
              .formatRelativeTime(relativeDepositEndTimeDays, "days", {
                numeric: "always",
              })
              .replace("in ", "") + " left"
          );
        } else if (relativeDepositEndTimeHours) {
          return (
            intl
              .formatRelativeTime(relativeDepositEndTimeHours, "hours", {
                numeric: "always",
              })
              .replace("in ", "") + " left"
          );
        }
        return "";
      case Governance.ProposalStatus.VOTING_PERIOD:
        const relativeVotingEndTime =
          (new Date(proposal.raw.voting_end_time).getTime() - current) / 1000;
        const relativeVotingEndTimeDays = Math.floor(
          relativeVotingEndTime / (3600 * 24)
        );
        const relativeVotingEndTimeHours = Math.ceil(
          relativeVotingEndTime / 3600
        );

        if (relativeVotingEndTimeDays) {
          return (
            intl
              .formatRelativeTime(relativeVotingEndTimeDays, "days", {
                numeric: "always",
              })
              .replace("in ", "") + " left"
          );
        } else if (relativeVotingEndTimeHours) {
          return (
            intl
              .formatRelativeTime(relativeVotingEndTimeHours, "hours", {
                numeric: "always",
              })
              .replace("in ", "") + " left"
          );
        }
        return "";
      case Governance.ProposalStatus.FAILED:
      case Governance.ProposalStatus.PASSED:
      case Governance.ProposalStatus.REJECTED:
      case Governance.ProposalStatus.UNSPECIFIED:
        return "";
    }
  };

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
          {proposals.map((proposal, index) => {
            return (
              <ListGroupItem key={index}>
                <a>
                  <Row>
                    <Col xs="8">{`#${proposal.id}`}</Col>
                    <Col xs="4">
                      <GovernanceProposalStatusChip
                        status={proposal.proposalStatus}
                      />
                    </Col>
                    <Col xs="12">{proposal.title}</Col>
                    <Col xs="12">{renderProposalDateString(proposal)}</Col>
                    <Col xs="12">{proposalRelativeEndTimeString(proposal)}</Col>
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

export const GovernanceProposalStatusChip: FunctionComponent<{
  status: Governance.ProposalStatus;
}> = ({ status }) => {
  switch (status) {
    case Governance.ProposalStatus.DEPOSIT_PERIOD:
      return <span color="primary">Deposit period</span>;
    case Governance.ProposalStatus.VOTING_PERIOD:
      return <span color="primary">Voting period</span>;
    case Governance.ProposalStatus.PASSED:
      return <span color="primary">Passed</span>;
    case Governance.ProposalStatus.REJECTED:
      return <span color="danger">Rejected</span>;
    case Governance.ProposalStatus.FAILED:
      return <span color="danger">Failed</span>;
    default:
      return <span color="danger">Unspecified</span>;
  }
};

export const dateToLocalString = (intl: IntlShape, dateStr: string) => {
  if (!dateStr) {
    return;
  }

  const current = new Date();
  const date = new Date(dateStr);
  const isYearDifferent = current.getFullYear() !== date.getFullYear();

  return intl
    .formatDate(dateStr, {
      format: "en",
      year: isYearDifferent ? "numeric" : undefined,
    })
    .replace("GMT", "UTC");
};
