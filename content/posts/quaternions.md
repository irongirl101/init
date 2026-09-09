---
title: "Quaternions"
date: "2026-09-09"
layout: "post"
tags:
    - "ARVR"
    - "Quaternion"
    - "Learning" 
---

_'Here as he walked by, on the 16th  of October 1843 Sir William Rowan Hamilton had a flash of genius discovered the fundmental formula for quaternion multiplication ``` 
i^2 = j^2 = k^2 = ijk = -1 
``` and cut it on a stone of this bridge. (Broom Bridge, Dublin)'_ -- Quaternion Plaque, Dublin

When I first heard of this terminology in my ARVR class, I was nothing but confused. So the sole purpose of this blog is for it to be my rubber duck :) 

### Before going into Quaternions, Euler values 
Its a basic 3D graph -- represented by x,y and z components. It is a much easier way to visualize objects and it is usually the *default* way of going about rotations, focusing more on the order of the rotations. 

``` 
                    
                    z
                    │
                    │
                    │
                    │
                    O──────────── y
                   /
                  /
                 /
                /
               x
```


##But what is a Quaternion

Quaternions were invented to capture the algebra of rotations of 3-dimensional real space, extending the way that the complex numbers capture the algebra of rotations of 2-dimensional real space.

A point in 2D space can be represented using 
    _```x = a + bi```_

Multiplying z by a unit complex number ```e^{i\ϴ} = cos (ϴ) + i sin(ϴ)``` rotates that point around the origin by angle ϴ.

Hamilton spent years trying to do the exact same thing in 3D space with triplets a + bi + cj,  but 3-element systems cannot form a closed division algebra—multiplying two triplets naturally spits out cross-terms that demand a fourth dimension. On his walk , he realized that to rotate in 3D, you need **four** dimensions, introducing three distinct imaginary units: i, j, and k.

The set of all quaternions is denoted by H (in honor of Hamilton):
```H = {w + xi + yj + zk; w, x, y, z in R}```

### If Euler's values are easier to understand, easier to visualize and is a defualt value, why use Quaternions?
- Quaternions do not care about order as much as Euler does. 
    - If a rotation is done on X axis, Y axis then Z axis on a matrix of coordinates (for an object) of say M 
    ``` 
    The final rotation matrix would be 
            R = Rz * Ry * Rx * M 
    ```
    where, Rz, Ry, Rz are all rotation matrices around z,y,x axes. 
    
    **Quaternions does not care about the order.** 

    If exists a unit axis (x,y,z) and an angle of rotation is ϴ, the rotated quaternion 
    ```
    r = (cos ϴ/2, x . sin ϴ/2 , y . sin ϴ/2, z . sin ϴ/2)
    ``` 
    so rotations are done around that particular axis. 

    - *Euler descirbes a rotation as a sequence of rotations around axes. A quaternion does the same as one mathematical object.*

- Prevention of Gimbal Lock
As we've seen before, Euler is very order-oriented. Take an example of this cube shown below. 
Let Red -> X axis rotation, Green -> Y axis rotation, Blue -> Z axis rotation, and let the middle axis be Y, X is the smallest. 
<img src="/init/assets/images/blog%20images/gimbal.png" alt="Gimbal lock visualization" width="320" height = "160">
If say, there is a rotation of X (90 deg) and then Y (90 deg), then X and Z would have lined up. So, if we were to rotate using the outermost ring (Z)/ rotate the innermost ring (X), it would lead to the exact same rotation of the object. So a whole dimension is lost, and degrees of freedom (rotation) are also lost. 
This is known as a gimbal lock. 

    **Usage of Quaternions, does not allow for gimbal lock to occur -- due to the existence of another axis.** 


Hope ya learnt something from my ramblings :) 

