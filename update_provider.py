import re

with open("D:/Sahaay/src/pages/provider/ProviderDashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add useTranslation
content = content.replace(
    "import { useAuth } from '@/context/AuthContext'",
    "import { useAuth } from '@/context/AuthContext'\nimport { useTranslation } from 'react-i18next'"
)

content = content.replace(
    "const { user } = useAuth()",
    "const { user } = useAuth()\n  const { t } = useTranslation()"
)

# Text replacements
replacements = [
    ("Provider Dashboard", "{t('provider_dashboard_title', 'Provider Dashboard')}"),
    ("Loading your dashboard...", "{t('loading_dashboard', 'Loading your dashboard...')}"),
    ("Profile incomplete", "{t('profile_incomplete', 'Profile incomplete')}"),
    ("Profile Incomplete", "{t('profile_incomplete_title', 'Profile Incomplete')}"),
    ("Please finish setting up your provider profile to receive requests.", "{t('finish_setting_up', 'Please finish setting up your provider profile to receive requests.')}"),
    ("Complete Profile", "{t('complete_profile', 'Complete Profile')}"),
    ("Account Status", "{t('account_status', 'Account Status')}"),
    ("Pending Admin Approval", "{t('pending_admin_approval', 'Pending Admin Approval')}"),
    ("Your service provider account is currently under review by our administrators.\n                You will be able to receive and accept customer requests once your profile is approved.", "{t('pending_approval_desc', 'Your service provider account is currently under review by our administrators. You will be able to receive and accept customer requests once your profile is approved.')}"),
    ("Status: ", "{t('status_status', 'Status')}: "), # be careful with this one
    ("View Profile", "{t('view_profile', 'View Profile')}"),
    ("Your Profile Details", "{t('your_profile_details', 'Your Profile Details')}"),
    ("Uncategorized Service", "{t('uncategorized_service', 'Uncategorized Service')}"),
    ("Location not set", "{t('location_not_set', 'Location not set')}"),
    ("years experience", "{t('years_experience_suffix', 'years experience')}"),
    ("About Me", "{t('about_me', 'About Me')}"),
    ("Manage your incoming jobs, active bookings, and earnings.", "{t('manage_incoming_jobs', 'Manage your incoming jobs, active bookings, and earnings.')}"),
    ("{isLive ? 'Currently Live' : 'Currently Offline'}", "{isLive ? t('current_live', 'Currently Live') : t('current_offline', 'Currently Offline')}"),
    ("{isLive ? 'Your location is being broadcast to nearby customers.' : 'Go live to start receiving service requests.'}", "{isLive ? t('your_location_broadcast', 'Your location is being broadcast to nearby customers.') : t('go_live_to_receive', 'Go live to start receiving service requests.')}"),
    ("{isLive ? 'Go Offline' : 'Go Live'}", "{isLive ? t('go_offline', 'Go Offline') : t('go_live', 'Go Live')}"),
    ("'New Requests'", "t('new_requests', 'New Requests')"),
    ("'Active Jobs'", "t('active_jobs_label', 'Active Jobs')"),
    ("'Avg Rating'", "t('avg_rating', 'Avg Rating')"),
    ("'New'", "t('new', 'New')"),
    ("'Total Earnings'", "t('total_earnings_label', 'Total Earnings')"),
    ("New Service Requests", "{t('new_service_requests', 'New Service Requests')}"),
    ("waiting for your response", "{t('waiting_response', 'waiting for your response')}"),
    ("View all ", "{t('view_all_requests', 'View all')} "),
    ("No new service requests", "{t('no_new_requests', 'No new service requests')}"),
    ("You will be notified when customers in your area request your service.", "{t('you_will_be_notified', 'You will be notified when customers in your area request your service.')}"),
    ("'Service Request'", "t('service_request', 'Service Request')"),
    ("'Customer'", "t('customer', 'Customer')"),
    ("Active Jobs<", "{t('active_upcoming', 'Active Jobs')}<"),
    ("No active jobs right now.", "{t('no_active_jobs', 'No active jobs right now.')}"),
    ("Start Job", "{t('start_job_provider', 'Start Job')}"),
    ("Mark Complete", "{t('mark_complete_provider', 'Mark Complete')}"),
    ("Earnings Summary", "{t('earnings_summary', 'Earnings Summary')}"),
    ("Total lifetime earnings", "{t('total_lifetime', 'Total lifetime earnings')}"),
    ("Completed Jobs<", "{t('completed_jobs_provider', 'Completed Jobs')}<"),
    (">Details<", ">{t('details_link', 'Details')}<"),
    (">Accept<", ">{t('accept', 'Accept')}<"),
    (">Decline<", ">{t('decline', 'Decline')}<")
]

for old, new in replacements:
    content = content.replace(old, new)

# Fix some exact tags that might have been improperly matched
content = content.replace(
    "<DashboardLayout role=\"provider\" pageTitle=\"Provider Dashboard\" pageSubtitle=\"Loading your dashboard...\">",
    "<DashboardLayout role=\"provider\" pageTitle={t('provider_dashboard_title', 'Provider Dashboard')} pageSubtitle={t('loading_dashboard', 'Loading your dashboard...')}>"
)

content = content.replace(
    "<DashboardLayout role=\"provider\" pageTitle=\"Provider Dashboard\" pageSubtitle=\"Profile incomplete\">",
    "<DashboardLayout role=\"provider\" pageTitle={t('provider_dashboard_title', 'Provider Dashboard')} pageSubtitle={t('profile_incomplete', 'Profile incomplete')}>"
)

content = content.replace(
    "<DashboardLayout role=\"provider\" pageTitle=\"Provider Dashboard\" pageSubtitle=\"Account Status\">",
    "<DashboardLayout role=\"provider\" pageTitle={t('provider_dashboard_title', 'Provider Dashboard')} pageSubtitle={t('account_status', 'Account Status')}>"
)

content = content.replace(
    "<DashboardLayout role=\"provider\" pageTitle=\"Provider Dashboard\" pageSubtitle=\"Manage your incoming jobs, active bookings, and earnings.\">",
    "<DashboardLayout role=\"provider\" pageTitle={t('provider_dashboard_title', 'Provider Dashboard')} pageSubtitle={t('manage_incoming_jobs', 'Manage your incoming jobs, active bookings, and earnings.')}>"
)

with open("D:/Sahaay/src/pages/provider/ProviderDashboard.tsx", "w", encoding="utf-8") as f:
    f.write(content)
