import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ProfileView } from '../../src/ProfileView';
import { useSession } from '../../src/session';
export default function UserPage() { const { handle } = useLocalSearchParams<{ handle: string }>(); const { user } = useSession(); return <ProfileView handle={String(handle)} me={user?.handle === handle} />; }
