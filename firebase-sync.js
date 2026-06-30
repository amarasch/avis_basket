const _origSetItem = Storage.prototype.setItem;
let FIREBASE_READY  = false;
let _syncInProgress = false;
let _db             = null;

Storage.prototype.setItem = function(key, value) {
  _origSetItem.call(this, key, value);
  if (FIREBASE_READY && !_syncInProgress && key === 'avisBasketPagamenti') {
    _db.collection('avisBasket').doc('pagamenti')
      .set({ data: value, aggiornato: firebase.firestore.FieldValue.serverTimestamp() })
      .catch(err => console.error('[Firebase] write error:', err));
  }
};

function initFirebaseSync() {
  try {
    _db = firebase.firestore();
    FIREBASE_READY = true;

    _db.collection('avisBasket').doc('pagamenti').onSnapshot(snap => {
      if (!snap.exists || !snap.data()?.data) return;
      const remoteData = snap.data().data;
      if (remoteData === localStorage.getItem('avisBasketPagamenti')) return;

      _syncInProgress = true;
      _origSetItem.call(localStorage, 'avisBasketPagamenti', remoteData);
      if (typeof records !== 'undefined') {
        try { records = JSON.parse(remoteData); } catch (_) {}
      }
      if (typeof renderTable === 'function') renderTable();
      setTimeout(() => { _syncInProgress = false; }, 100);
    }, err => console.error('[Firebase] snapshot error:', err));

    console.log('%c[Firebase] ✓ Connesso', 'color:#EAB308;font-weight:bold');
  } catch (err) {
    console.warn('[Firebase] Offline – localStorage:', err);
    FIREBASE_READY = false;
  }
}

if (typeof firebase !== 'undefined' && firebase.apps?.length > 0) {
  initFirebaseSync();
}
