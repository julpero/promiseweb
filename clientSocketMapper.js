const userSocketIdMap = new Map(); //a map of online usernames and their clients

module.exports = {
    addClientToMap: function (userName, socketId, gameId){
        if (!userSocketIdMap.has(userName)) {
            //when user is joining first time
            userSocketIdMap.set(userName, { sockets: new Set([socketId]), games: new Set([gameId])});
        } else {
            //user had already joined from one client and now joining using another client
            userSocketIdMap.get(userName).sockets.add(socketId);
            userSocketIdMap.get(userName).games.add(gameId);
        }
    },

    removeClientFromMap: function (userName, socketId, gameId){
        if (userSocketIdMap.has(userName)) {
            let userSocketIdSet = userSocketIdMap.get(userName);
            userSocketIdSet.sockets.delete(socketId);
            userSocketIdSet.games.delete(gameId);
            //if there are no clients for a user, remove that user from online list (map)
            if (userSocketIdSet.size == 0 ) {
                userSocketIdMap.delete(userName);
            }
        }
    },

    getClientNameFromMap: function (socketId) {
        var name = null;
        userSocketIdMap.forEach(function(value, key) {
            // console.log(value);
            const sockets = Array.from(value.sockets);
            for (var i = 0; i < sockets.length; i++) {
                // console.log(sockets[i]);
                if (sockets[i] == socketId) {
                    name = key;
                }
            }
        });
        return name;
    },

    getSocketFromMap: function (userName) {
        if (userSocketIdMap.has(userName)) {
            return userSocketIdMap.get(userName).sockets;
        }
    },

    isUserConnected: function (userName) {
        return userSocketIdMap.has(userName);
    },

    userSocketIdMap: userSocketIdMap,
}

