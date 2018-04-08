export default function(ctx, transformFn) {
    return new Promise((resolve, reject) => {
        ctx.storage.get(function (error, data) {
            if (error) {
                reject(error);
                return
            }
            data = transformFn(data);
            var attempts = 3;
            ctx.storage.set(data, function set_cb(error) {
                if (error) {
                    if (error.code === 409 && attempts--) {
                        // resolve conflict and re-attempt set
                        data = transformFn(error.conflict);
                        return ctx.storage.set(data, set_cb);
                    }
                    reject(error);
                    return
                }
                resolve(data);
                return;
            });
        });
    });
}
