class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(otherVector) {
        return new Vector2(this.x + otherVector.x, this.y + otherVector.y);
    }

    subtract(otherVector) {
        return new Vector2(this.x - otherVector.x, this.y - otherVector.y);
    }

    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    dot (otherVector) {
        return this.x * otherVector.x + this.y * otherVector.y;
    }

    project (otherVector) {
        return otherVector.multiply(this.dot(otherVector) / 1);
    }

    cross (otherVector) {
        return this.x * otherVector.y - this.y * otherVector.x;
    }

    divide(scalar) {
        return new Vector2(this.x / scalar, this.y / scalar);
    }

    distance(otherVector) {
        const diffX = this.x - otherVector.x;
        const diffY = this.y - otherVector.y;
        return Math.sqrt(diffX * diffX + diffY * diffY);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    sqr_magnitude() {
        return this.x * this.x + this.y * this.y;
    }

    normalized() {
        const mag = this.magnitude();
        if (mag <= 0.00001) {
            return new Vector2(0, 0);
        }
        return new Vector2(this.x / mag, this.y / mag);
    }
}

class Circle {
    constructor(position, radius) {
        this.position = position || new Vector2(0, 0);
        this.radius = radius || 0.0;
    } 
}

class Line {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}

// ------------------------------------------------------------
const canvas = document.getElementById("canvas");
const canvas_ctx = canvas.getContext("2d");
canvas_ctx.scale(1, -1);
canvas_ctx.translate(0, -canvas.height);
const canvas_width = canvas.width;
const canvas_height = canvas.height;
const canvas_clear_color = "#d7d7d7";

const static_objects = [];
let player_object = null;
let player_hit = null;
const mouse_position = new Vector2(0, 0);

canvas.addEventListener("mousemove", (event) => {
    mouse_position.x = event.clientX;
    mouse_position.y = canvas_height - event.clientY;
});

function wait_promise(ms) {
    return new Promise((req) => setTimeout(() => req(), ms));
}

async function update_loop() {
    logic_init();
    while (true) {
        logic_update();
        render();
        await wait_promise(1 / 60 * 1000);
    }
}

function logic_init() {
    init_create_objects();
}

function logic_update() {
    calculate_player_hit();
}

function render() {
    render_clear();
    render_objects();
    render_player_aim();
    render_player_hit();
}

// logic init functions

function init_create_objects() {
    // create static objects
    const circle1 = new Circle(new Vector2(325, 200), 32);
    const circle2 = new Circle(new Vector2(325, 500), 32);
    const leftWall = new Line(new Vector2(100, 50), new Vector2(100, 550));
    const rightWall = new Line(new Vector2(350, 50), new Vector2(550, 550));
    const topWall = new Line(new Vector2(150, 650), new Vector2(500, 650));
    static_objects.push(circle1);
    static_objects.push(circle2);
    static_objects.push(leftWall);
    static_objects.push(rightWall);
    static_objects.push(topWall);
    // create player object
    player_object = new Circle(new Vector2(325, 350), 32);
}

// logic update functions

function get_player_velocity() {
    return mouse_position.subtract(player_object.position);
}

function calculate_player_hit() {
    const player_velocity = get_player_velocity();

    for (const object of static_objects) {
        player_hit = null;

        if (object instanceof Circle) {
            player_hit = check_circle_to_circle_collision(
                player_object,
                player_velocity,
                object,
                new Vector2(0, 0)
            );
        } else if (object instanceof Line) {
            player_hit = check_circle_to_line_collision(
                player_object,
                player_velocity,
                object
            );
        } else {
            console.log("Unknown object to collision detection: " + object);
        }

        if (player_hit.collided) {
            break;
        }
    }
}

function clamp01(value) {
    value = value < 0 ? 0 : value;
    value = value > 1 ? 1 : value;
    return value;
}

function lerp(a, b, t) {
    t = clamp01(t);
    return a + (b - a) * t;
}

function lerp2(a, b, t) {
    return new Vector2(
        lerp(a.x, b.x, t),
        lerp(a.y, b.y, t)
    );
}


function project_point_onto_line(point, line) {
    const start_to_point = point.subtract(line.start);
    const start_to_end = line.end.subtract(line.start);
    const dot = start_to_point.dot(start_to_end);
    const t = dot / start_to_end.sqr_magnitude();
    const projected_point = line.start.add(start_to_end.multiply(t));
    return {
        t,
        point: projected_point
    };
}

function closest_point_on_line(point, line) {
    var A1 = line.end.y - line.start.y;
    var B1 = line.start.x - line.end.x;
    var C1 = (line.end.y - line.start.y) * line.start.x + (line.start.x - line.end.x) * line.start.y;
    var C2 = -B1 * point.x + A1 * point.y;
    var det = A1 * A1 - -B1 * B1;
    var cx = 0;
    var cy = 0;
    if (det !== 0) {
      cx = (A1 * C1 - B1 * C2) / det;
      cy = (A1 * C2 - -B1 * C1) / det;
    } else {
      cx = point.x;
      cy = point.y;
    }
    return new Vector2(cx, cy);
}

function is_point_on_line(point, line) {
    const slope = (line.end.y - line.start.y) / (line.end.x - line.start.x);
    const y_yntercept = line.start.y - slope * line.start.x;
    const expected_y = slope * point.x + y_yntercept;
    return Math.abs(expected_y - point.y) < Number.EPSILON;
}

function find_lines_intersection(line, other_line) {
    const line_a = line.end.subtract(line.start);
    const line_b = other_line.end.subtract(other_line.start);
    const cross1 = other_line.start.subtract(line.start).cross(line_b);
    const cross2 = other_line.start.subtract(line.start).cross(line_a);
    const cross3 = line_a.cross(line_b);
    
    if (cross3 === 0) {
        return null;
    }

    const t = cross1 / cross3;
    const u = cross2 / cross3;
    const strict_intersection = !(t < 0 || t > 1 || u < 0 || u > 1);
    return {
        t, u, strict_intersection
    };
}

function check_circle_to_circle_collision(circle, circle_velocity, other_circle, other_circle_velocity) {
    const dx = other_circle.position.x - circle.position.x;
    const dy = other_circle.position.y - circle.position.y;
    const dvx = other_circle_velocity.x - circle_velocity.x;
    const dvy = other_circle_velocity.y - circle_velocity.y;
    const dvdr = dx * dvx + dy * dvy;
    if (dvdr > 0) return {
        collided: false,
        toi: Infinity,
        collision_point: null
    };
    const dvdv = dvx * dvx + dvy * dvy;
    if (dvdv == 0) return {
        collided: false,
        toi: Infinity,
        collision_point: null
    };
    const drdr = dx * dx + dy * dy;
    const sigma = circle.radius + other_circle.radius;
    const d = (dvdr * dvdr) - dvdv * (drdr - sigma * sigma);
    if (dvdv == 0) return {
        collided: false,
        toi: Infinity,
        collision_point: null
    };
    const toi = -(dvdr + Math.sqrt(d)) / dvdv;
    if (toi >= 0 && toi <= 1) {
        const collision_point = new Vector2(
            circle.position.x + circle_velocity.x * toi,
            circle.position.y + circle_velocity.y * toi
        );
        return {
            collided: true,
            toi: toi,
            collision_point: collision_point
        };
    }
    return {
        collided: false,
        toi: toi,
        collision_point: null
    };
}

function check_circle_to_line_collision(circle, circle_velocity, line) {
    const circle_position_onto_line = project_point_onto_line(circle.position, line);
    const close_to_circle = circle_position_onto_line.point;
    const t = circle_position_onto_line.t;
    const radius_sqr = circle.radius * circle.radius;
    const dist_sqr = circle.position.subtract(close_to_circle).sqr_magnitude();
    const line_normal = close_to_circle.subtract(circle.position).normalized();

    if (dist_sqr < radius_sqr && t >= 0 && t <= 1) {
        return {
            collided: true,
            toi: 0,
            collision_point: circle.position
        };
    }

    const circle_end = circle.position.add(circle_velocity);
    const intersect_result = find_lines_intersection(line, new Line(circle.position, circle_end));

    if (intersect_result == null) {
        const dot_start = line.start.subtract(circle.position).dot(circle_velocity);
        const dot_end = line.end.subtract(circle.position).dot(circle_velocity);

        let endpoint = new Circle();

        if (dot_start < 0) {
            if (dot_end < 0) {
                return {
                    collided: false,
                    toi: Infinity,
                    collision_point: null
                };
            }

            endpoint.position = new Vector2(line.end.x, line.end.y);
        } 
        else if (dot_end < 0) {
            endpoint.position = new Vector2(line.start.x, line.start.y);
        }
        else {
            endpoint.position = (dot_start < dot_end) ?
                new Vector2(line.start.x, line.start.y) :
                new Vector2(line.end.x, line.end.y);
        }

        return check_circle_to_circle_collision(
            circle,
            circle_velocity,
            endpoint,
            new Vector2(0, 0)
        );
    }

    const velocity_toward_line = circle_velocity.project(line_normal);
    const speed_toward_line = velocity_toward_line.magnitude();
    const dist_minus_radius = Math.sqrt(dist_sqr) - circle.radius;
    
    if (speed_toward_line < dist_minus_radius) {
        return {
            collided: false,
            toi: Infinity,
            collision_point: null
        };
    }

    const toi = dist_minus_radius / speed_toward_line;
    const circle_end_position_onto_line = project_point_onto_line(circle_end, line);
    const end_t = circle_end_position_onto_line.t;
    const intersect_t = lerp(t, end_t, toi);

    if (intersect_t >= 0 && intersect_t <= 1 &&
        velocity_toward_line.dot(close_to_circle.subtract(circle.position)) >= 0) {
        const intersection_point = circle.position.add(circle_velocity.multiply(toi));
        return {
            collided: true,
            toi: toi,
            collision_point: intersection_point
        };
    }

    const near_endpoint = new Circle(new Vector2(line.start.x, line.start.y));
    if (end_t > 1) {
        near_endpoint.position.x = line.end.x;
        near_endpoint.position.y = line.end.y;
    }

    return check_circle_to_circle_collision(
        circle,
        circle_velocity,
        near_endpoint,
        new Vector2(0, 0)
    );
}

// render functions

function render_clear() {
    canvas_ctx.clearRect(0, 0, canvas_width, canvas_height);
    canvas_ctx.fillStyle = canvas_clear_color;
    canvas_ctx.strokeStyle = "#000000";
    canvas_ctx.fillRect(0, 0, canvas_width, canvas_height);
}

function render_objects() {
    const objects = static_objects.slice();
    objects.push(player_object);

    for (const object of objects) {
        if (object instanceof Circle) {
            render_circle(object);        
        } else if (object instanceof Line) {
            render_line(object);
        } else {
            console.log("Unknown object to render: " + object);
        }
    }
}

function render_circle(circle) {
    canvas_ctx.beginPath();
    canvas_ctx.arc(
        circle.position.x,
        circle.position.y,
        circle.radius,
        0,
        2 * Math.PI
    );
    canvas_ctx.stroke();
}

function render_line(line) {
    canvas_ctx.beginPath();
    canvas_ctx.moveTo(line.start.x, line.start.y);
    canvas_ctx.lineTo(line.end.x, line.end.y);
    canvas_ctx.stroke();
}

function render_player_aim() {
    canvas_ctx.beginPath();
    canvas_ctx.moveTo(player_object.position.x, player_object.position.y);
    canvas_ctx.lineTo(mouse_position.x, mouse_position.y);
    canvas_ctx.stroke();
}

function render_player_hit() {
    const render_hit_position = player_hit.collided ?
        player_hit.collision_point :
        mouse_position;
    canvas_ctx.strokeStyle = player_hit.collided ?
        "red" :
        "black";
    canvas_ctx.beginPath();
    canvas_ctx.arc(
        render_hit_position.x,
        render_hit_position.y,
        player_object.radius,
        0,
        2 * Math.PI
    );
    canvas_ctx.stroke();
}

update_loop();