# Scratchpads/Taxonworks Migration service

Testing the ability of Taxonworks to hold Scratchpads data by importing taxonomy records from a Scratchpads site to a Taxonworks project.

Specifically tested with a Solanaceae Source data dump.

Given the ID of a Scratchpads taxonomy term, the script will attempt to create that term and all of its descenants in a Taxonworks project. It also copies sources, authors, and synonym relationships for each term.

These are not one-to-one mappings, and some assumptions have been made, so the migration may not be 100% correct yet.

When records are created in taxonworks, the source (Scratchpads) ID and the destination (Taxonworks) ID are added to a map under the mappings directory, so we don't accidentally copy any record more than once.

## Install and run

This is a NodeJS project. Any fairly recent version of node should suffice. There are no npm dependencies to install.

To run this script you will need specially modified versions of Scratchpads and Taxonworks running:

 - Scratchpads branch [paul/rpc-endpoint](https://github.com/NaturalHistoryMuseum/scratchpads2/tree/paul/rpc-endpoint)
 - Taxonworks branch [paul/rpc-endpoint](https://github.com/NaturalHistoryMuseum/taxonworks/tree/paul/rpc-endpoint)

These branches add [jsonrpc](https://www.jsonrpc.org/specification) endpoints to scratchpads and taxonworks with some helpful export and import methods.

The configuration defaults make the following assumptions:

- Scratchpads is running at `http://localhost` and the `rpc_user` and `rpc_password` config vars are not changed from their defaults (`'scratchpads'` and `''`, respectively).
- Taxonworks is running at `http://localhost:3000`, and your user ID is `1` and your project id is `1`.

If any of these are incorrect you can easily change them in the `index.js` file.

To run the script you will need to know the `tid` of the Scratchpads taxonomy term you want to migrate.
This can be found, for example, as the number in the URL of the Edit Term page.

Once you have this number, pass it as an argument to the node script:

`node index.js 1234`

This will start of the migration script, which will run until all descendant terms, sources and authors have been migrated, or until an error occurs (more likely).
