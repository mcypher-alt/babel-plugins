export default function (api) {
    const t = api.types;
    const template = api.template;
    function transformFunc(path) {
        const name = path.node.id.name;
        path.node.id.name = `_original_${name}`;
        path.node.leadingComments = [];

        path.insertAfter(template.ast(`
            const _cache_${name} = new Map();
            function ${name}(...args) {
                const key = JSON.stringify(args);
                if (_cache_${name}.has(key)) return _cache_${name}.get(key);
                const result = _original_${name}.apply(this, args);
                _cache_${name}.set(key, result);
                return result;
            }
        `));

        path.skip();
    };

    function transformVariableFunc(path) {
        const declarator = path.get('declarations')[0];
        if (!declarator) return;

        const name = declarator.node.id.name;
        const init = declarator.get('init');
        if (!init.node) return;

        // Фикс для стрелочных функций (a => a), чтобы шаблон не развалился
        const initCode = `(${init.toString()})`;

        const nodes = template.ast(`
            const _original_${name} = ${initCode};
            const _cache_${name} = new Map();
            function ${name}(...args) {
                const key = JSON.stringify(args);
                if (_cache_${name}.has(key)) return _cache_${name}.get(key);
                const result = _original_${name}.apply(this, args);
                _cache_${name}.set(key, result);
                return result;
            }
        `);

        nodes.forEach(node => node._processed = true);

        const targetPath = path.parentPath.isExportNamedDeclaration() ? path.parentPath : path;

        path.scope.removeBinding(name);
        targetPath.replaceWithMultiple(nodes);
        targetPath.skip();
    };

    return {
        visitor: {
            ExportNamedDeclaration(path) {
                if (path.node._processed) return;
                const comments = path.node.leadingComments;
                if (!comments) return;

                let isMemoized = false;
                for (let i = 0; i < comments.length; i++) {
                    if (comments[i].value.includes("@memoized")) {
                        isMemoized = true;
                        break;
                    }
                }

                if (isMemoized) {
                    const declarationPath = path.get('declaration');
                    if (declarationPath.isFunctionDeclaration()) {
                        transformFunc(declarationPath);
                    } else if (declarationPath.isVariableDeclaration()) {
                        transformVariableFunc(declarationPath);
                    }
                    path.node._processed = true;
                }
            },
            FunctionDeclaration(path) {
                if (path.node._processed || path.parentPath.isExportNamedDeclaration()) return;
                const comments = path.node.leadingComments;
                if (!comments) return;

                let isMemoized = false;
                for (let i = 0; i < comments.length; i++) {
                    if (comments[i].value.includes("@memoized")) {
                        isMemoized = true;
                        break;
                    }
                }
                if (isMemoized) {
                    transformFunc(path);
                }
            },
            VariableDeclaration(path) {
                if (path.node._processed || path.parentPath.isExportNamedDeclaration()) return;
                const comments = path.node.leadingComments;
                if (!comments) return;

                let isMemoized = false;
                for (let i = 0; i < comments.length; i++) {
                    if (comments[i].value.includes("@memoized")) {
                        isMemoized = true;
                        break;
                    }
                }
                if (isMemoized) {
                    transformVariableFunc(path);
                }
            }
        }
    };
}
