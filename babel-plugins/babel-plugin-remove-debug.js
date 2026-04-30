module.exports = function (api) {
    const isProd = api.env("production");
    const t = api.types;

    return {
        visitor: {
            CallExpression(path) {
                if (!isProd) return;
                const callee = path.node.callee;
                if (callee.object &&
                    callee.object.name === 'console' &&
                    callee.property &&
                    ['log', 'debug', 'info', 'trace'].includes(callee.property.name)) {
                    let isDebug = false;
                    let currentPath = path;
                    while (currentPath) {
                        const node = currentPath.node;
                        const comments = node.leadingComments;
                        if (comments) {
                            for (let i = 0; i < comments.length; i++) {
                                if (comments[i].value.includes('@debug')) {
                                    isDebug = true;
                                    break;
                                }
                            }
                        }
                        if (isDebug) break;
                        currentPath = currentPath.parentPath;
                    }

                    if (!isDebug) {
                        if (path.parentPath.isExpressionStatement()) {
                            path.remove();
                        } else {
                            path.replaceWith(t.unaryExpression("void", t.numericLiteral(0)));
                        }
                    }
                }
            },
            DebuggerStatement(path) {
                if(!isProd) return;
                let currentPath = path;
                let isDebug = false;
                while(currentPath) {
                    const node = currentPath.node;
                    const comments = node.leadingComments;
                    if(comments){
                        for (let i = 0; i < comments.length; i++) {
                            if (comments[i].value.includes('@debug')) {
                                isDebug = true;
                                break;
                            }
                        }
                    }
                    if (isDebug) break;
                    currentPath = currentPath.parentPath;
                }
                if(isDebug === false) path.remove();
            },
            IfStatement(path) {
                if(!isProd) return;
                let currentPath = path;
                let isDebug = false;
                while(currentPath) {
                    const node = currentPath.node;
                    const comments = node.leadingComments;
                    if(comments){
                        for (let i = 0; i < comments.length; i++) {
                            if (comments[i].value.includes('@debug')) {
                                isDebug = true;
                                break;
                            }
                        }
                    }
                    if (isDebug) break;
                    currentPath = currentPath.parentPath;
                }
                const test = path.node.test;
                if (test.type === "Identifier") {
                    const name = test.name;
                    if ((name === "isDebug" || name === "isDev") && isDebug === false) {
                        path.remove();
                        return;
                    }
                }
                if (test.type === 'MemberExpression' &&
                    test.object && test.object.name === 'window' &&
                    test.property && test.property.name === '__DEBUG__' &&
                    !isDebug) {
                    path.remove();
                }
            }
        }
    }
}
