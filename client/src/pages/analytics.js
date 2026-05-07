import dynamic from 'next/dynamic';

const AnalyticsPage = dynamic(() => import('./AdminAnalytics'), { ssr: false });

export default AnalyticsPage;
