import { redirect } from 'next/navigation';
import { auth } from 'thepopebot/auth';
import { ProfileTelegramPage } from 'thepopebot/chat';
import { getTelegramProfileInitial } from 'thepopebot/chat/telegram-profile';

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const initial = await getTelegramProfileInitial(session.user.id);
  return <ProfileTelegramPage initial={initial} />;
}
