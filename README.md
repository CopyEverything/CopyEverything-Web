Setup instructions:

=== General ===
## Install CouchDB with the configuration outlined below and then:
npm install 	   # install required nodejs packages
nodejs initdb.js   # initalizes the couchdb databases
forever server.js  # starts the server!

=== CouchDB ===
Follow these instructions for a safe and up-to-date installation on Ubuntu:
https://www.digitalocean.com/community/tutorials/how-to-install-couchdb-and-futon-on-ubuntu-14-04

Create a user in CouchDB's futon with the following credententials (change them in db.js if needed):

var user = 'admin';
var pass = 'strongpasswordCE';

In the config file (default.ini) which can be found by running 'couchdb -c', change the following:
1.) Set require_valid_user to true.
