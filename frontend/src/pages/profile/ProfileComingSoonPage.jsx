import ProfilePageShell, { EmptyCard } from '../../components/profile/ProfilePageShell';

export default function ProfileComingSoonPage({ title = 'Coming soon' }) {
  return (
    <ProfilePageShell title={title}>
      <EmptyCard message={`${title} — coming soon`} />
    </ProfilePageShell>
  );
}
