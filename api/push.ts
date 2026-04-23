import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { target_user_id, title, body } = req.body;

  if (!target_user_id || !title) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // Set VAPID keys
  const publicKey = process.env.VITE_PUBLIC_VAPID_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@todoxvos.com';

  if (!publicKey || !privateKey) {
    console.error('Missing VAPID keys');
    return res.status(500).json({ error: 'Push notification service is not fully configured on the server.' });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  // Init Supabase Client
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Database configuration missing.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get the push subscription from the profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('push_subscription')
      .eq('id', target_user_id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch user profile.' });
    }

    if (!profile?.push_subscription) {
      // User hasn't subscribed to push notifications, just ignore gracefully
      return res.status(200).json({ message: 'User is not subscribed to push notifications.' });
    }

    // Send the notification
    const payload = JSON.stringify({
      title,
      body,
      icon: '/favicon.svg'
    });

    await webpush.sendNotification(profile.push_subscription, payload);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Push error:', err);
    return res.status(500).json({ error: 'Failed to send push notification.' });
  }
}
