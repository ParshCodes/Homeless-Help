import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSafeSpot } from '../context/SafeSpotContext';
import MedicalTabs from '../components/MedicalTabs';
import EditHistory from '../components/EditHistory';

const Profile = () => {
  const router = useRouter();
  const { id } = router.query;
  const { api } = useSafeSpot();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      const { data } = await api.get(`/users/${id}`);
      setProfile(data);
    };

    fetchProfile();
  }, [api, id]);

  if (!profile) {
    return <p>Loading profile...</p>;
  }

  return (
    <div className="profile-view">
      <header>
        <h1>{profile.name}</h1>
        <p>DOB: {profile.dob}</p>
        <button type="button" className={profile.urgent_flag ? 'urgent' : ''}>
          {profile.urgent_flag ? 'Urgent' : 'Mark as Urgent'}
        </button>
      </header>
      <MedicalTabs profile={profile} />
      <EditHistory history={profile.history || []} />
    </div>
  );
};

export default Profile;
