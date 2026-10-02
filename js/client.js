/* global TrelloPowerUp */
const ICON = 'https://happytomatoe.github.io/trello-card-table-powerup/img/icon.svg';

TrelloPowerUp.initialize({
  'card-back-section': function (t) {
    return {
      title: 'Description tables',
      icon: ICON,
      content: { type: 'iframe', url: t.signUrl('./section.html'), height: 300 },
      action: {
        text: 'Refresh',
        callback: function (t) {
          return t.set('card', 'shared', 'tableRefresh', Date.now());
        },
      },
    };
  },
});
