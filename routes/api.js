 /*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb');
var ObjectId = require('mongodb').ObjectID;
var xssFilters = require('xss-filters');

const DB_URI = 'mongodb://rahmiul:Danielde7@ds343127.mlab.com:43127/issue_tracker'; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});
const ENDPOINT = '/api/issues/:project'

module.exports = function (app) {

  app.route(ENDPOINT)
  
    .get(function (req, res){
      const project = req.params.project;
      const query = req.query;
      if (query._id)  query._id = new ObjectId (query._id);
      if (query.open === 'true' || query.open ==='')  query.open = true;
      else if (query.open === 'false')  query.open = false;
      
      MongoClient.connect(DB_URI)
        .then( db => {
          const collection = db.collection( project );
          collection.find( query ).sort( {updated_on : 1} ).toArray( ( err, doc ) => {
            if ( !err ) res.json( doc );
            else        res.send( err );
          });
        })
        .catch( err => res.send( err ) );  
    })
    
    .post(function (req, res){
      const project  = xssFilters.inHTMLData( req.params.project );
      const newIssue = {
        issue_title : req.body.issue_title,
        issue_text  : req.body.issue_text,
        created_by  : req.body.created_by,
        assigned_to : req.body.assigned_to,
        status_text : req.body.status_text,
        open        : true
      }
      
      //sanitize input
      for ( let input in newIssue ) {
        if ( input !== 'open' ) {
          newIssue[ input ] = xssFilters.inHTMLData( newIssue[ input ] );
          if ( newIssue[ input ] === 'undefined') newIssue[ input ] =  undefined
        }
      }
      
      //add date  issue_title, issue_text, created_by
      newIssue.created_on = new Date();
      newIssue.updated_on = new Date();
      
      if ( newIssue.issue_title && newIssue.issue_text && newIssue.created_by ) {
        MongoClient.connect(DB_URI)
          .then( db => {
            const collection = db.collection( project );
            collection.insertOne( newIssue )
              .then ( doc => {
                newIssue._id = doc.insertedId;
                res.json( newIssue )
              })
              .catch ( err => res.send( err ) );
          })
          .catch( err => res.send( err ))
      
      } else {
        res.send( 'Sorry, but "issue_title", "issue_text" and "created_by" are all required'  ) 
      }
    
  })
    
    .put(function (req, res){
      const project = xssFilters.inHTMLData( req.params.project );
      const inputs  = req.body;
      const issueId = inputs._id;
      
      delete inputs._id;       //delete id in input
      
      for ( let input in inputs ) {
        if ( !inputs[input] && input !== 'open') {
          delete inputs[input]
        }
        else {
          inputs[ input ] = xssFilters.inHTMLData( inputs[ input ])
        }
      }
      
      //test if inputs contain updated field
      if ( Object.keys(inputs).length > 0 ) {
        inputs.open       = inputs.open ? false : true;
        inputs.updated_on = new Date();
        console.log(inputs)
        console.log(issueId);
        MongoClient.connect(DB_URI)
          .then ( db => {
            const collection = db.collection( project );
            collection.findAndModify(
              { _id : new ObjectId( issueId ) },
              [ [ '_id',1 ] ],
              { $set: inputs }
            )
              .then( doc => res.send( 'successfully updated' ))
              .catch( err => res.send(`could not update ${issueId} id`))
        })
          .catch( err => res.send( err ) )
      }
      else {
        res.send( 'no updated field sent' )
      }
      
    })
    
    .delete(function (req, res){
      const project = req.params.project;
      const issueId = req.body._id
      
      if (issueId) {
        MongoClient.connect(DB_URI)
          .then ( db => {
            console.log('connected');
            const collection = db.collection( project );
            collection.findOneAndDelete(
              { _id : new ObjectId( issueId ) }
            )
              .then( doc => {
                console.log('deleted');
                res.send( `success: 'deleted ${issueId}`)}
              )
              .catch( err => res.send( `failed: 'could not delete ${issueId}` ) )
          })
          .catch( err => res.send( `could not delete ${issueId}` ) )
      }
      else {
        res.send( '_id error')
      }
    });
    
};
