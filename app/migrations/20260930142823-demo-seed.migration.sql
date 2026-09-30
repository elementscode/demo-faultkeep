-- demo seed: two users, two projects, a week of events across fifteen issues

select setseed(0.4242);

insert into users (email, name, passwordHash) values
  ('ada@faultkeep.test', 'Ada Lovelace', crypt('faultkeep', genSalt('bf', 12))),
  ('grace@faultkeep.test', 'Grace Hopper', crypt('faultkeep', genSalt('bf', 12)));

insert into projects (name, dsnKey) values
  ('Storefront', 'fk_5f0c3e9a1b7d4c28a6e1f3b9d2c7a410'),
  ('Admin Dashboard', 'fk_8b2e6d4f0a9c4e17b3d5a7f1c9e2b654');

insert into projectMembers (projectId, userId)
  select p.id, u.id from projects p cross join users u;

create temp table seedIssues (
  project text,
  errorType text,
  message text,
  stack text,
  weight integer,
  startDays numeric,
  endDays numeric,
  bias numeric,
  userPool integer,
  browsers text[],
  urls text[],
  finalStatus text,
  assignee text,
  fingerprint text
) on commit drop;

insert into seedIssues (project, errorType, message, stack, weight, startDays, endDays, bias, userPool, browsers, urls, finalStatus, assignee) values
  ('Storefront', 'TypeError', 'Cannot read properties of undefined (reading ''price'')',
   E'TypeError: Cannot read properties of undefined (reading ''price'')\n    at CartLine.render (https://shop.example.com/assets/cart.8f3a21c4.js:214:31)\n    at renderLines (https://shop.example.com/assets/cart.8f3a21c4.js:188:12)\n    at Array.map (<anonymous>)\n    at CartDrawer.update (https://shop.example.com/assets/cart.8f3a21c4.js:97:22)\n    at HTMLButtonElement.onAddToCart (https://shop.example.com/assets/product.2b9e7d10.js:61:9)',
   420, 7, 0, 1.0, 180, null, array['/products/linen-shirt', '/products/canvas-tote', '/cart', '/products/wool-scarf'], 'unresolved', 'ada@faultkeep.test'),

  ('Storefront', 'TypeError', 'Failed to fetch',
   E'TypeError: Failed to fetch\n    at fetchInventory (https://shop.example.com/assets/api.41c7e9b2.js:38:18)\n    at loadProduct (https://shop.example.com/assets/product.2b9e7d10.js:22:25)\n    at async ProductPage.mount (https://shop.example.com/assets/product.2b9e7d10.js:14:5)',
   260, 7, 0, 0.8, 150, null, array['/products/linen-shirt', '/products/denim-jacket', '/collections/summer'], 'unresolved', null),

  ('Storefront', 'ReferenceError', 'trackEvent is not defined',
   E'ReferenceError: trackEvent is not defined\n    at trackPurchase (https://shop.example.com/assets/analytics.0d4f8a6e.js:12:5)\n    at CheckoutForm.onComplete (https://shop.example.com/assets/checkout.c2a91f37.js:302:7)',
   150, 7, 0, 1.0, 120, null, array['/checkout/complete'], 'ignored', null),

  ('Storefront', 'TypeError', 'undefined is not an object (evaluating ''wallet.canMakePayments'')',
   E'canShowWalletPay@https://shop.example.com/assets/checkout.c2a91f37.js:88:42\nPaymentButtons@https://shop.example.com/assets/checkout.c2a91f37.js:120:18\nmount@https://shop.example.com/assets/vendor.77ab0c3d.js:4411:9',
   90, 5, 0, 1.0, 70, array['Safari 17.6|macOS', 'Mobile Safari 17.6|iOS'], array['/checkout', '/cart'], 'unresolved', 'grace@faultkeep.test'),

  ('Storefront', 'Error', 'Payment intent confirmation timed out after 15000ms',
   E'Error: Payment intent confirmation timed out after 15000ms\n    at confirmPayment (https://shop.example.com/assets/checkout.c2a91f37.js:412:13)\n    at async CheckoutForm.submit (https://shop.example.com/assets/checkout.c2a91f37.js:356:7)',
   64, 1.8, 0, 0.6, 58, null, array['/checkout'], 'unresolved', null),

  ('Storefront', 'RangeError', 'Invalid time value',
   E'RangeError: Invalid time value\n    at Date.toISOString (<anonymous>)\n    at formatDeliveryDate (https://shop.example.com/assets/shipping.5e0b3c92.js:27:30)\n    at ShippingOptions.render (https://shop.example.com/assets/shipping.5e0b3c92.js:74:16)',
   45, 7, 3.2, 1.0, 40, null, array['/checkout/shipping'], 'resolved', 'ada@faultkeep.test'),

  ('Storefront', 'SyntaxError', 'Unexpected token ''<'', "<!DOCTYPE "... is not valid JSON',
   E'SyntaxError: Unexpected token ''<'', "<!DOCTYPE "... is not valid JSON\n    at JSON.parse (<anonymous>)\n    at parseResponse (https://shop.example.com/assets/api.41c7e9b2.js:71:17)\n    at async fetchReviews (https://shop.example.com/assets/reviews.9a1d6f04.js:18:20)',
   110, 7, 0, 1.4, 90, null, array['/products/linen-shirt', '/products/canvas-tote'], 'unresolved', null),

  ('Storefront', 'TypeError', 'Cannot read properties of null (reading ''addEventListener'')',
   E'TypeError: Cannot read properties of null (reading ''addEventListener'')\n    at initSearch (https://shop.example.com/assets/search.e61b2a75.js:9:14)\n    at https://shop.example.com/assets/main.13c0f8d9.js:33:3',
   30, 4, 2, 1.0, 28, null, array['/search', '/'], 'resolved', 'grace@faultkeep.test'),

  ('Storefront', 'Error', 'ResizeObserver loop completed with undelivered notifications.',
   '',
   200, 7, 0, 1.0, 160, null, array['/', '/collections/summer', '/products/wool-scarf'], 'ignored', null),

  ('Admin Dashboard', 'TypeError', 'Cannot read properties of undefined (reading ''map'')',
   E'TypeError: Cannot read properties of undefined (reading ''map'')\n    at OrdersTable.renderRows (https://admin.example.com/static/orders.3c8e1a0f.js:142:28)\n    at OrdersTable.render (https://admin.example.com/static/orders.3c8e1a0f.js:120:17)\n    at commitRoot (https://admin.example.com/static/vendor.b04d2e7a.js:8812:5)',
   180, 7, 0, 1.0, 24, null, array['/orders', '/orders?status=pending'], 'unresolved', 'grace@faultkeep.test'),

  ('Admin Dashboard', 'Error', 'Chart container has zero width',
   E'Error: Chart container has zero width\n    at RevenueChart.mount (https://admin.example.com/static/charts.71f9c3b6.js:56:11)\n    at Dashboard.didMount (https://admin.example.com/static/dashboard.4a2e0d18.js:33:14)',
   70, 6, 0, 1.0, 18, null, array['/', '/reports/revenue'], 'unresolved', null),

  ('Admin Dashboard', 'TypeError', 'Failed to fetch',
   E'TypeError: Failed to fetch\n    at pollMetrics (https://admin.example.com/static/metrics.8d0a7f3e.js:19:22)\n    at https://admin.example.com/static/metrics.8d0a7f3e.js:44:7',
   120, 7, 0, 0.9, 21, null, array['/', '/reports/traffic'], 'unresolved', null),

  ('Admin Dashboard', 'TypeError', 'Failed to fetch dynamically imported module: https://admin.example.com/static/customers.e9b1c0d4.js',
   E'TypeError: Failed to fetch dynamically imported module: https://admin.example.com/static/customers.e9b1c0d4.js\n    at importRoute (https://admin.example.com/static/runtime.60c2e8f1.js:1:3121)\n    at loadRoute (https://admin.example.com/static/router.b5a3d9e0.js:88:12)',
   55, 1.5, 0, 0.7, 20, null, array['/customers', '/customers/1042'], 'unresolved', null),

  ('Admin Dashboard', 'AbortError', 'The user aborted a request.',
   E'AbortError: The user aborted a request.\n    at abortPending (https://admin.example.com/static/api.2f7c4b19.js:61:9)\n    at SearchBox.onInput (https://admin.example.com/static/search.0a9e3d57.js:24:5)',
   40, 7, 0, 1.0, 16, null, array['/customers', '/orders'], 'ignored', null),

  ('Admin Dashboard', 'RangeError', 'Maximum call stack size exceeded',
   E'RangeError: Maximum call stack size exceeded\n    at flattenTree (https://admin.example.com/static/permissions.c7d1e4a2.js:15:20)\n    at flattenTree (https://admin.example.com/static/permissions.c7d1e4a2.js:18:14)\n    at flattenTree (https://admin.example.com/static/permissions.c7d1e4a2.js:18:14)',
   25, 5, 1.2, 1.0, 9, null, array['/settings/roles'], 'resolved', 'ada@faultkeep.test');

update seedIssues set fingerprint = fkFingerprint(errorType, message, stack);

do $$
declare
  r record;
  vPool text[] := array[
    'Chrome 129|macOS', 'Chrome 129|Windows', 'Chrome 128|Windows', 'Safari 17.6|macOS',
    'Mobile Safari 17.6|iOS', 'Chrome Mobile 129|Android', 'Firefox 130|Windows', 'Edge 129|Windows'
  ];
begin
  -- Traffic follows the day: times are pulled toward 18:00 UTC and thinned
  -- out overnight, so the charts have a daily rhythm instead of a flat line.
  for r in
    select w.*,
           case when w.raw - w.pull < now() then w.raw - w.pull else w.raw end as at
      from (
        select s.*,
               p.id as projectId,
               p.name as projectName,
               coalesce(s.browsers, vPool) as pool,
               t.raw,
               make_interval(secs => 2.2 * 3600 * sin(2 * pi() * (extract(epoch from t.raw) / 3600 - 18) / 24)) as pull
          from seedIssues s
          join projects p on p.name = s.project
          cross join generate_series(1, s.weight) g(n)
          cross join lateral (
            select now() - (s.endDays * interval '1 day')
                         - ((s.startDays - s.endDays) * interval '1 day') * power(random(), s.bias) as raw
             where g.n > 0
          ) t
      ) w
     order by at
  loop
    perform ingestEvent(
      r.projectId,
      r.errorType,
      r.message,
      r.stack,
      (case when r.projectName = 'Storefront' then 'https://shop.example.com' else 'https://admin.example.com' end)
        || r.urls[1 + floor(random() * cardinality(r.urls))::int],
      split_part(r.pool[1 + floor(random() * cardinality(r.pool))::int], '|', 1),
      null,
      'Mozilla/5.0',
      (case when r.projectName = 'Storefront' then 'storefront@' else 'admin@' end)
        || case when r.at < now() - interval '5 days' then '2.4.0'
                when r.at < now() - interval '2 days' then '2.4.1'
                else '2.5.0' end,
      case when random() < 0.15 then null
           else (case when r.projectName = 'Storefront' then 'customer-' else 'staff-' end)
                || (1000 + floor(random() * r.userPool))::int end,
      r.at
    );
  end loop;
end;
$$;

-- The browser and its os were drawn as a pair; split them back out.
update events e
   set os = split_part(pair, '|', 2)
  from (select unnest(array[
    'Chrome 129|macOS', 'Chrome 129|Windows', 'Chrome 128|Windows', 'Safari 17.6|macOS',
    'Mobile Safari 17.6|iOS', 'Chrome Mobile 129|Android', 'Firefox 130|Windows', 'Edge 129|Windows'
  ]) as pair) p
 where e.os = ''
   and split_part(p.pair, '|', 1) = e.browser
   and (e.browser <> 'Chrome 129' or (hashtext(e.id::text) % 2 = 0) = (split_part(p.pair, '|', 2) = 'macOS'));

insert into issueTags (issueId, key, value, timesSeen)
  select issueId, 'os', os, count(*) from events where os <> '' group by issueId, os;

update events
   set userAgent = case
     when browser like 'Chrome Mobile%' then 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'
     when browser like 'Mobile Safari%' then 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'
     when browser like 'Safari%' then 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15'
     when browser like 'Firefox%' then 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0'
     when browser like 'Edge%' then 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0'
     when os = 'macOS' then 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' || split_part(browser, ' ', 2) || '.0.0.0 Safari/537.36'
     else 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' || split_part(browser, ' ', 2) || '.0.0.0 Safari/537.36'
   end;

update issues i
   set status = s.finalStatus,
       assigneeId = (select id from users where email = s.assignee),
       resolvedAt = case when s.finalStatus = 'resolved' then i.lastSeen + interval '3 hours' end
  from seedIssues s
  join projects p on p.name = s.project
 where i.projectId = p.id and i.fingerprint = s.fingerprint;

-- The bad-JSON issue was resolved four days ago and came back.
update issues i
   set regressedAt = (select min(createdAt) from events e
                       where e.issueId = i.id and e.createdAt > now() - interval '4 days')
 where i.title like 'SyntaxError%';
