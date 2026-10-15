import { redirect } from 'next/navigation';

/** v2: a new conversation starts from Jack's home. */
export default function NewChatPage() {
  redirect('/');
}
