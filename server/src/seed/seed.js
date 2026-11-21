/**
 * Seeds demo data: users for every role, 3 projects and ~36 issues spread
 * across the workflow with comments + history over the last 14 days.
 *
 *   npm run seed            → wipes BugBoard collections and re-seeds
 */
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Project = require('../models/Project');
const Issue = require('../models/Issue');
const Comment = require('../models/Comment');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

const PASSWORD = 'Password@123';

const USERS = [
  { name: 'Aarav Admin', email: 'admin@bugboard.dev', role: 'admin' },
  { name: 'Diya Sharma', email: 'diya@bugboard.dev', role: 'developer' },
  { name: 'Rohan Mehta', email: 'rohan@bugboard.dev', role: 'developer' },
  { name: 'Kabir Nair', email: 'kabir@bugboard.dev', role: 'developer' },
  { name: 'Tara Iyer', email: 'tara@bugboard.dev', role: 'tester' },
  { name: 'Neel Joshi', email: 'neel@bugboard.dev', role: 'tester' },
];

const PROJECTS = [
  {
    name: 'Payments Gateway',
    key: 'PAY',
    description: 'Checkout, UPI and card payment flows for the web store.',
    members: ['admin', 'diya', 'rohan', 'tara'],
  },
  {
    name: 'Mobile App',
    key: 'MOB',
    description: 'React Native customer app — Android and iOS.',
    members: ['admin', 'rohan', 'kabir', 'neel'],
  },
  {
    name: 'Admin Console',
    key: 'ADM',
    description: 'Internal tooling for support and operations teams.',
    members: ['admin', 'diya', 'kabir', 'tara', 'neel'],
  },
];

const BUGS = {
  PAY: [
    ['UPI intent fails on Android 14 with PhonePe', 'Tapping "Pay with UPI" opens PhonePe but returns to app with status=FAILURE even though money is debited. Reproducible on Pixel 7 / Android 14.', 'critical', 'urgent'],
    ['Double charge when user taps Pay twice quickly', 'No idempotency key on /checkout/confirm. Two requests within ~300ms create two captures.', 'critical', 'urgent'],
    ['Card number field accepts letters', 'Input mask is not applied on Safari, letters can be typed into the card number field.', 'medium', 'medium'],
    ['Refund webhook not retried on 5xx', 'If our webhook handler returns 502 the provider retries, but we drop the event because the signature check uses a stale secret.', 'high', 'high'],
    ['Currency shows $ instead of ₹ on invoice PDF', 'Invoice template hardcodes the USD symbol. Should use order.currency.', 'low', 'medium'],
    ['Coupon code is case sensitive', '"SAVE10" works but "save10" says invalid coupon.', 'low', 'low'],
    ['Checkout spinner never stops on network timeout', 'When the payment API times out the UI keeps spinning forever, no error shown.', 'medium', 'high'],
    ['GST breakup missing for B2B orders', 'CGST/SGST lines are not shown when the customer enters a GSTIN.', 'medium', 'medium'],
    ['3DS popup blocked by Firefox', 'The 3-D Secure challenge opens in a popup that Firefox blocks by default.', 'high', 'high'],
    ['Saved cards list shows expired cards', 'Cards with past expiry should be hidden or marked as expired.', 'low', 'low'],
    ['Payment success page leaks order id of other users', 'Changing ?order= in the URL shows another customer\'s order summary. Missing ownership check.', 'critical', 'urgent'],
    ['Wallet balance not refreshed after top-up', 'User has to log out and back in to see updated wallet balance.', 'medium', 'medium'],
  ],
  MOB: [
    ['App crashes on launch when offline', 'Fatal exception in SplashScreen when the config fetch fails — no fallback for offline mode.', 'critical', 'urgent'],
    ['Dark mode text unreadable on order history', 'Order history uses #222 text on #1a1a1a background in dark theme.', 'medium', 'medium'],
    ['Push notifications arrive twice on iOS', 'FCM token is registered on every app launch without unregistering the previous one.', 'high', 'high'],
    ['Pull to refresh jumps list to top', 'After refreshing, the FlatList scroll position resets to the very top.', 'low', 'low'],
    ['Biometric login loops after OS update', 'After updating to iOS 18.1 Face ID succeeds but app shows the login screen again.', 'high', 'urgent'],
    ['Images not cached, heavy data usage', 'Product images are re-downloaded on every screen visit.', 'medium', 'medium'],
    ['Keyboard covers the OTP input on small screens', 'On iPhone SE the OTP field is hidden behind the keyboard.', 'medium', 'high'],
    ['Deep link to product opens home screen', 'bugboard://product/123 opens the app but stays on home.', 'medium', 'medium'],
    ['Logout does not clear cart badge', 'Cart badge count stays visible after logout until app restart.', 'low', 'low'],
    ['Android back button closes app from checkout', 'Hardware back on checkout exits the app instead of going to cart.', 'high', 'high'],
    ['Search returns empty for Hindi keywords', 'Searching "जूते" returns no results though products have Hindi tags.', 'medium', 'medium'],
    ['App size grew to 180MB after last release', 'Unused Lottie animations and fonts are bundled.', 'low', 'medium'],
  ],
  ADM: [
    ['Export CSV breaks on names with commas', 'Customer names containing commas shift all following columns.', 'medium', 'medium'],
    ['Support agents can see admin-only refund button', 'Button is hidden via CSS only; API also allows the action for agent role.', 'critical', 'urgent'],
    ['Date filter uses UTC instead of IST', 'Orders placed after 6:30 PM IST show up on the next day.', 'medium', 'high'],
    ['Pagination resets when changing sort', 'Changing sort order sends the user back to page 1 and loses filters.', 'low', 'low'],
    ['Bulk update times out over 500 rows', 'Bulk status update request takes > 30s and gateway times out.', 'high', 'high'],
    ['Audit log missing actor for automated jobs', 'Cron job entries show "undefined" as actor.', 'low', 'medium'],
    ['Session not invalidated after password reset', 'Old JWT keeps working after the user resets the password.', 'high', 'urgent'],
    ['Charts render blank on first load', 'Dashboard charts are blank until the window is resized.', 'medium', 'medium'],
    ['Typo in suspension email template', '"Your acount has been suspended" — typo in subject line.', 'low', 'low'],
    ['Role dropdown allows selecting "superadmin"', 'Leftover enum value from v1 that the API rejects with 500.', 'medium', 'medium'],
    ['Search is slow on customers collection', 'Regex search without index takes ~4s on 200k documents.', 'high', 'high'],
    ['Inline edit loses changes on blur', 'Clicking outside an inline-edit cell discards the change without saving.', 'medium', 'medium'],
  ],
};

const COMMENTS = [
  'Able to reproduce this on staging. Looking into it now.',
  'Root cause found — will push a fix shortly.',
  'Can you share the device logs / HAR file?',
  'Verified on the latest build, looks good from QA side.',
  'Still happening for me on the latest build. Moving back.',
  'Added a regression test for this case.',
  'This is blocking the release, raising priority.',
  'Fixed in PR #214, ready for testing.',
];

// Path each bug takes through the workflow → ends in the last status
const PATHS = [
  ['open'],
  ['open', 'in_progress'],
  ['open', 'in_progress', 'testing'],
  ['open', 'in_progress', 'testing', 'resolved'],
  ['open', 'in_progress', 'testing', 'resolved', 'closed'],
  ['open', 'in_progress', 'testing', 'in_progress'],
];
const PATH_FOR_INDEX = [0, 1, 2, 3, 4, 1, 0, 2, 3, 5, 0, 1];

const pick = (arr, i) => arr[i % arr.length];
const daysAgo = (d, h = 0) => new Date(Date.now() - d * 864e5 - h * 36e5);

async function seed() {
  await mongoose.connect(env.mongoUri);
  console.log('Connected — clearing collections…');
  await Promise.all([User, Project, Issue, Comment, Activity, Notification].map((m) => m.deleteMany({})));

  const users = {};
  for (const u of USERS) {
    const doc = await User.create({ ...u, password: PASSWORD });
    users[u.email.split('@')[0]] = doc;
  }
  const admin = users.admin;

  for (const p of PROJECTS) {
    const project = await Project.create({
      name: p.name,
      key: p.key,
      description: p.description,
      members: p.members.map((m) => users[m]._id),
      createdBy: admin._id,
    });
    const devs = p.members.map((m) => users[m]).filter((u) => u.role === 'developer');
    const testers = p.members.map((m) => users[m]).filter((u) => u.role === 'tester');

    const issues = [];
    const activities = [];
    const comments = [];

    BUGS[p.key].forEach(([title, description, severity, priority], i) => {
      const number = i + 1;
      const path = PATHS[PATH_FOR_INDEX[i]];
      const reporter = i % 3 === 0 ? admin : pick(testers, i);
      const dev = pick(devs, i);
      const assignee = path.length > 1 || i % 2 === 0 ? dev : null;

      // Spread creation over last 13 days, each workflow step a few hours later
      const DAY_SPREAD = [13, 12, 12, 11, 9, 8, 8, 8, 6, 4, 3, 3, 1, 0];
      const created = daysAgo(DAY_SPREAD[(i * 5 + p.key.charCodeAt(0)) % DAY_SPREAD.length], (i * 5) % 20);
      const _id = new mongoose.Types.ObjectId();
      let t = created.getTime();

      activities.push({ issue: _id, project: project._id, actor: reporter._id, type: 'created', to: `${p.key}-${number}`, createdAt: new Date(t) });
      if (assignee) {
        t += 2 * 36e5;
        activities.push({ issue: _id, project: project._id, actor: admin._id, type: 'assignee', from: null, to: assignee._id, createdAt: new Date(t) });
      }
      for (let s = 1; s < path.length; s++) {
        t += (8 + ((i * 7) % 30)) * 36e5;
        if (t > Date.now()) t = Date.now() - (path.length - s) * 6e4;
        const actor = ['testing', 'open'].includes(path[s]) && path[s - 1] === 'in_progress' ? assignee : path[s] === 'in_progress' && path[s - 1] === 'open' ? assignee : pick(testers, i + s);
        activities.push({ issue: _id, project: project._id, actor: actor._id, type: 'status', field: 'status', from: path[s - 1], to: path[s], createdAt: new Date(t) });
        if (s === 2 || (s === 1 && i % 2)) {
          comments.push({ issue: _id, author: actor._id, body: pick(COMMENTS, i + s), createdAt: new Date(t + 6e5), updatedAt: new Date(t + 6e5) });
          activities.push({ issue: _id, project: project._id, actor: actor._id, type: 'comment', createdAt: new Date(t + 6e5) });
        }
      }

      issues.push({
        _id,
        project: project._id,
        number,
        key: `${p.key}-${number}`,
        title,
        description,
        severity,
        priority,
        status: path[path.length - 1],
        reporter: reporter._id,
        assignee: assignee ? assignee._id : null,
        attachments: [],
        createdAt: created,
        updatedAt: new Date(Math.min(t + 6e5, Date.now())),
        __v: 0,
      });
    });

    // Raw inserts keep the historical timestamps (Mongoose would overwrite them)
    await Issue.collection.insertMany(issues);
    await Activity.collection.insertMany(activities);
    if (comments.length) await Comment.collection.insertMany(comments);
    await Project.updateOne({ _id: project._id }, { issueSeq: issues.length });
    console.log(`  ${p.key}: ${issues.length} issues, ${comments.length} comments`);
  }

  await Notification.create({
    user: users.diya._id,
    actor: admin._id,
    type: 'assigned',
    message: 'Welcome to BugBoard! You have issues waiting for you.',
  });

  await Promise.all([User, Project, Issue, Comment, Activity, Notification].map((m) => m.syncIndexes()));

  console.log('\nDemo accounts (password for all: %s)', PASSWORD);
  USERS.forEach((u) => console.log(`  ${u.role.padEnd(10)} ${u.email}`));
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
