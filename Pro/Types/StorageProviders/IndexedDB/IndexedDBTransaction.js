$data.Class.define('$data.storageProviders.IndexedDBPro.IndexedDBTransaction', $data.Transaction, null, {
    abort: function () {
        $data.Trace.log("onabort: ", this._objectId);
        this.transaction.abort();
    }
}, null);