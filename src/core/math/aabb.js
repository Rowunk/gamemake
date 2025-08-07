// src/core/math/aabb.js
'use strict';

import { Vec3 } from './vec3.js';

export class AABB {
  constructor(min = new Vec3(0,0,0), max = new Vec3(0,0,0)) {
    this.min = min.clone();
    this.max = max.clone();
  }

  containsPoint(p) {
    const { min, max } = this;
    return (p.x >= min.x && p.x <= max.x) &&
           (p.y >= min.y && p.y <= max.y) &&
           (p.z >= min.z && p.z <= max.z);
  }

  intersects(other) {
    return !(this.max.x < other.min.x || this.min.x > other.max.x ||
             this.max.y < other.min.y || this.min.y > other.max.y ||
             this.max.z < other.min.z || this.min.z > other.max.z);
  }
}
