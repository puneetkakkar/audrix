module.exports = {
    attributes: {
        trackId: {
            type: 'string',
            required: true,
            unique: true,
            primaryKey: true
        },
        danceability: {
            type: 'object',
            required: false
        },
        energy: {
            type: 'float',
            required: false
        },
        acousticness: {
            type: 'float',
            required: false
        },
        tempo: {
            type: 'float',
            required: false
        },
        valence: {
            type: 'float',
            required: false
        },
        speechiness: {
            type: 'float',
            required: false
        },
        mode: {
            type: 'integer',
            required: false
        },
        key: {
            type: 'integer',
            required: false
        },
        average_loudness: {
            type: 'float',
            required: false
        },
        duration: {
            type: 'float',
            required: false  
        },
        instrumentalness: {
            type: 'float',
            required: false    
        },
        timbre: {
            type: 'object',
            required: false      
        },
        dynamic_complexity: {
            type: 'float',
            required: false
        },
        onset_rate: {
            type: 'float',
            required: false    
        },
        lowlevel_danceability: {
            type: 'float',
            required: false      
        },
        gender: {
            type: 'object',
            required: false        
        },
        tonal_atonal: {
            type: 'object',
            required: false               
        },
        beats_count: {
            type: 'float',
            required: false                 
        }
    }
};