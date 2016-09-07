Setup instructions:

=== General ===
## Install CouchDB with the configuration outlined below and then:
npm install 	   # install required nodejs packages
nodejs initdb.js   # initalizes the couchdb databases
forever server.js  # starts the server!

=== CouchDB ===
Create a user in CouchDB's futon with the following credententials (change them in db.js if needed):

var user = 'admin';
var pass = 'strongpasswordCE';

In the config file (likely located at /usr/local/etc/couchdb/default.ini), change the following:
1.) Set require_valid_user to true.
