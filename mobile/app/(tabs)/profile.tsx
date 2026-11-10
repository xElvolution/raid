import React from 'react';
import { ProfileView } from '../../src/ProfileView';
import { useSession } from '../../src/session';
import { Redirect } from 'expo-router';
export default function Me() { const { user } = useSession(); if (!user) return <Redirect href="/signin" />; return <ProfileView handle={user.handle} me />; }
