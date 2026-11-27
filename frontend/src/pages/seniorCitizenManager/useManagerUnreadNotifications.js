import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';

export default function useManagerUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications/');

      const notifications = Array.isArray(response.data)
        ? response.data
        : [];

      setUnreadCount(
        notifications.filter(
          (notification) => !notification.is_read
        ).length
      );
    } catch (error) {
      console.error(
        'Unable to refresh unread notification count:',
        error
      );
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();

    const intervalId = window.setInterval(
      refreshUnreadCount,
      30000
    );

    return () => window.clearInterval(intervalId);
  }, [refreshUnreadCount]);

  return { unreadCount, refreshUnreadCount };
}