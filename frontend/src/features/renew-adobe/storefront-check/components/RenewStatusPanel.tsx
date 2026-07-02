import type {
  RenewCheckResultKind,
  StorefrontRenewStatusCode,
} from "../types/storefrontRenew.types";
import {
  ActivateSuccessCard,
  ActivatingSpinner,
  CheckSuccessCard,
  ErrorCard,
  ExpiredCard,
  InfoCard,
  NeedsProfileSwitchCard,
  NeedsSyncCard,
  OutsideOrderCard,
} from "./RenewStatusCards";

export type RenewStatusPanelProps = {
  loading: boolean;
  activating: boolean;
  syncing: boolean;
  resultType: RenewCheckResultKind;
  message: string | null;
  profileName: string | null;
  email: string;
  outsideOrderStatus: Extract<
    StorefrontRenewStatusCode,
    "no_order" | "order_expired"
  > | null;
  successNeedsProductLink: boolean;
  urlAccess: string | null;
};


export function RenewStatusPanel(props: RenewStatusPanelProps) {
  const {
    loading,
    activating,
    syncing,
    resultType,
    message,
    profileName,
    email,
    outsideOrderStatus,
    successNeedsProductLink,
    urlAccess,
  } = props;

  if (activating) {
    return <ActivatingSpinner email={email} profileName={profileName} />;
  }

  if (syncing) {
    return (
      <ActivatingSpinner
        email={email}
        profileName={profileName}
        label="Đang đồng bộ dữ liệu Ades..."
      />
    );
  }

  if (loading || !resultType || (resultType !== "outside-order" && !message)) {
    return null;
  }

  return (
    <div>
      {resultType === "check-success" && (
        <CheckSuccessCard
          profileName={profileName}
          successNeedsProductLink={successNeedsProductLink}
          message={message}
          urlAccess={urlAccess}
        />
      )}
      {resultType === "outside-order" && (
        <OutsideOrderCard outsideOrderStatus={outsideOrderStatus} />
      )}
      {resultType === "expired" && (
        <ExpiredCard profileName={profileName} message={message} />
      )}
      {resultType === "needs-sync" && (
        <NeedsSyncCard profileName={profileName} message={message} />
      )}
      {resultType === "needs-profile-switch" && (
        <NeedsProfileSwitchCard profileName={profileName} message={message} />
      )}
      {resultType === "activate-success" && (
        <ActivateSuccessCard profileName={profileName} />
      )}
      {resultType === "error" && <ErrorCard message={message} />}
      {resultType === "info" && <InfoCard message={message} />}
    </div>
  );
}