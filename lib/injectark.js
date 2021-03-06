import { Factory } from './factory.js' // eslint-disable-line

export class Injectark {
  /** @param {{strategy?: Object<string, any>, factory?: Factory,
     * parent?: Injectark}} Object  */
  constructor ({ strategy = {}, factory = null, parent = null } = {}) {
    this.strategy = strategy
    this.factory = factory
    this.parent = parent
    this.registry = {}
  }

  /** @param {string} resource */
  resolve (resource) {
    const fetched = this._registryFetch(resource)
    if (fetched) {
      return fetched
    }

    const resourceStrategy = this.strategy[resource] || {}
    const persist = !(resourceStrategy.ephemeral)
    const instance = this._dependencyBuild(resource, persist)

    return instance
  }

  /** @param {{strategy?: Object<string, any>, factory?: Factory }}
   * Object */
  forge ({ strategy = {}, factory = null } = {}) {
    return new Injectark(
      { parent: this, strategy: strategy, factory: factory })
  }

  /** @param {string} resource */
  _registryFetch (resource) {
    let fetched = false
    const rule = this.strategy[resource] || {}
    if (rule.unique) {
      return fetched
    }
    if (Object.keys(this.registry).includes(resource)) {
      fetched = this.registry[resource]
    } else {
      const parent = this.parent
      fetched = parent ? parent._registryFetch(resource) : false
    }
    return fetched
  }

  _dependencyBuild (resource, persistent) {
    let instance = null
    let persist = persistent
    const rule = this.strategy[resource] || {
      method: resource.substr(0, 1).toLowerCase() + resource.substr(1)
    }

    let extract = (method) => this.factory[method]
    if (this.factory.extract) {
      extract = this.factory.extract.bind(this.factory)
    }
    const builder = extract(rule.method)

    if (builder) {
      const dependencies = builder.dependencies || []
      const dependencyInstances = []

      for (const dependency of dependencies) {
        const dependencyInstance = this.resolve(dependency)
        dependencyInstances.push(dependencyInstance)
      }
      instance = builder.bind(this.factory)(...dependencyInstances)
    } else {
      instance = (this.parent
        ? this.parent._dependencyBuild(resource, persist)
        : instance)

      const resourceStrategy = this.strategy[resource] || {}
      persist = (persist && resourceStrategy.unique)
    }

    if (persist) {
      this.registry[resource] = instance
    }

    return instance
  }
}
