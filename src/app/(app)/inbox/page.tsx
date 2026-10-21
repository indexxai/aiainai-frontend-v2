import { redirect } from 'next/navigation';

/** Everything that needs you lives in Approvals; old Inbox links land there. */
export default function InboxPage() {
  redirect('/approvals');
}
