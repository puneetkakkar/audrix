/**
 * Development environment settings
 *
 * This file can include shared settings for a development team,
 * such as API keys or remote database passwords.  If you're using
 * a version control solution for your Sails app, this file will
 * be committed to your repository unless you add it to your .gitignore
 * file.  If your repository will be publicly viewable, don't add
 * any private information to this file!
 *
 */

 module.exports = {

  /***************************************************************************
   * Set the default database connection for models in the development       *
   * environment (see config/connections.js and config/models.js )           *
   ***************************************************************************/

  // models: {
  //   connection: 'someMongodbServer'
  // }

  aws_config : {
  	accessKeyId: 'AKIAI2X5VDPNOUGP3JKA',
  	secretAccessKey: '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',
  	// region: 'mumbai'
  },
  s3_config : {
  	bucket_name : 'audrix-development',
  	base_key_track : 'tracks',
  	base_key_logo : 'logo',
  	base_key_user : 'user',
  },
  elasticsearch: {
    host:'127.0.0.1:9200',
    index:'audrix',
    type:'tracks'
  }

};
