let db;
const request = indexedDB.open("budget", 1);

request.onupgradeneeded = function (event) {
  const db = event.target.result;
  db.createObjectStore("offlineDB", { autoIncrement: true });
  db.createObjectStore("pending", { autoIncrement: true });
};

request.onsuccess = function (event) {
  db = event.target.result;
};

request.onerror = function (event) {
  console.log("Woops! " + event.target.errorCode);
};
const FILES_TO_CACHE = ["/", "/index.html", "index.js", "styles.css"];

const CACHE_NAME = "static-cache-v2";
const DATA_CACHE_NAME = "data-cache-v1";

// install
self.addEventListener("install", function (evt) {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Your files were pre-cached successfully!");
      return cache.addAll(FILES_TO_CACHE);
    })
  );

  self.skipWaiting();
});

// activate
self.addEventListener("activate", function (evt) {
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            console.log("Removing old cache data", key);
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// fetch
self.addEventListener("fetch", async function (evt) {
  evt.respondWith(
    caches
      .open(DATA_CACHE_NAME)
      .then(async (cache) => {
        return fetch(evt.request.clone())
          .then(async (response) => {
            if (
              response.clone().status === 200 &&
              !response.url.includes("/api/")
            ) {
              cache.put(evt.request.url, response.clone());
            }
            if (
              evt.request.url.includes("/api/") &&
              evt.request.method === "GET"
            ) {
              data = await response.clone().json();
              const transaction = db.transaction(["offlineDB"], "readwrite");
              const store = transaction.objectStore("offlineDB");
              store.clear();
              data.forEach(async (element) => {
                await store.add(element);
              });
            }
            return response;
          })
          .catch(async (err) => {
            if (
              !evt.request.url.includes("/bulk") &&
              evt.request.method === "POST"
            ) {
              let amount = await evt.request.clone().json();
              const transactionPending = db.transaction(
                ["pending"],
                "readwrite"
              );
              const storePending = transactionPending.objectStore("pending");
              const transactionOffline = db.transaction(
                ["offlineDB"],
                "readwrite"
              );
              const storeOffline = transactionOffline.objectStore("offlineDB");
              await storePending.add(amount);
              await storeOffline.add(amount);
              return amount;
            }
            if (
              evt.request.url.includes("/api/") &&
              evt.request.method === "GET"
            ) {
              response = fetchOfflineDB().then(function (res) {
                return res;
              });
              return response;
            }
            return cache.match(evt.request);
          });
      })
      .catch((err) => console.log(err))
  );

  return;
});

function fetchOfflineDB() {
  return new Promise(function (resolve, reject) {
    const transaction = db.transaction(["offlineDB"], "readwrite");
    const store = transaction.objectStore("offlineDB");
    let data = store.getAll();
    data.onsuccess = function () {
      data.result.sort((a, b) => (a.date < b.date ? 1 : -1));
      var mockResponse = new Response(JSON.stringify(data.result));
      resolve(mockResponse);
    };
  });
}

function syncDatabase() {
  const transaction = db.transaction(["pending"], "readwrite");
  const store = transaction.objectStore("pending");
  const getAll = store.getAll();

  getAll.onsuccess = function () {
    if (getAll.result.length > 0) {
      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then(async () => {
          const transaction = db.transaction(["pending"], "readwrite");
          const store = transaction.objectStore("pending");
          await store.clear();
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };
}

setInterval(function () {
  console.log("checking online status");
  syncDatabase();
}, 1000);
