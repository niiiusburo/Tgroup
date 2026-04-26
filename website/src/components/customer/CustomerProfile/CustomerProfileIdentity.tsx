import { CustomerAssignments } from '../CustomerAssignments';
import { ProfileHeader } from './ProfileHeader';
import type { CustomerProfileData } from './types';

export function CustomerProfileIdentity({ profile }: { readonly profile: CustomerProfileData }) {
  return (
    <>
      <ProfileHeader profile={profile} />
      <CustomerAssignments
        companyName={profile.companyName}
        salestaffId={profile.salestaffid}
        salestaffLabel={profile.salestaffLabel}
        cskhId={profile.cskhid}
        cskhName={profile.cskhname}
        referralUserId={profile.referraluserid}
        sourceName={profile.sourcename}
      />
    </>
  );
}
