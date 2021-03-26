import { IResolvers } from "@graphql-tools/utils";
import createAuthParam from "../translate/create-auth-param";

function wrapCustomResolvers({
    resolvers,
    generatedResolvers,
    nodeNames,
}: {
    resolvers: IResolvers;
    nodeNames: string[];
    generatedResolvers: any;
}): IResolvers {
    let newResolvers: any = {};

    const {
        Query: customQueries = {},
        Mutation: customMutations = {},
        Subscription: customSubscriptions = {},
        ...rest
    } = resolvers as Record<string, any>;

    if (customQueries) {
        if (generatedResolvers.Query) {
            newResolvers.Query = { ...generatedResolvers.Query, ...customQueries };
        } else {
            newResolvers.Query = customQueries;
        }
    }

    if (customMutations) {
        if (generatedResolvers.Mutation) {
            newResolvers.Mutation = { ...generatedResolvers.Mutation, ...customMutations };
        } else {
            newResolvers.Mutation = customMutations;
        }
    }

    if (Object.keys(customSubscriptions).length) {
        newResolvers.Subscription = customSubscriptions;
    }

    const typeResolvers = Object.entries(rest).reduce((r, entry) => {
        const [key, value] = entry;

        if (!nodeNames.includes(key)) {
            return r;
        }

        return {
            ...r,
            [key]: {
                ...generatedResolvers[key],
                ...value,
            },
        };
    }, {});
    newResolvers = {
        ...newResolvers,
        ...typeResolvers,
    };

    (function wrapResolvers(obj) {
        Object.entries(obj).forEach(([key, value]) => {
            if (typeof value === "function") {
                obj[key] = (...args) => {
                    const { driver } = args[2];
                    if (!driver) {
                        throw new Error("context.diver missing");
                    }

                    const auth = createAuthParam({ context: args[2] });

                    args[2] = { ...args[2], auth };

                    return value(...args);
                };

                return;
            }

            if (typeof value === "object") {
                obj[key] = value;
                wrapResolvers(value);
            }
        });

        return obj;
    })(newResolvers);

    // Not to wrap the scalars and directives
    const otherResolvers = Object.entries(rest).reduce((r, entry) => {
        const [key, value] = entry;

        if (nodeNames.includes(key)) {
            return r;
        }

        return {
            ...r,
            [key]: value,
        };
    }, {});
    newResolvers = {
        ...newResolvers,
        ...otherResolvers,
    };

    return newResolvers;
}

export default wrapCustomResolvers;
