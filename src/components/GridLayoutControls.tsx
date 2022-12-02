/******************************************************************************
  *
   *
 * Copyright 2013-2022 Sighthound, Inc.
 *
 * Licensed under the GNU GPLv3 license found at
 * https://www.gnu.org/licenses/gpl-3.0.txt
 *
 * Alternative licensing available from Sighthound, Inc.
 * by emailing opensource@sighthound.com
 *
 * This file is part of the Sighthound Video project which can be found at
 * https://github.com/sighthoundinc/SighthoundVideo
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; using version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02111, USA.
 *
  *
*******************************************************************************/

import * as React from 'react';
require('../styles/GridLayoutControls.scss');

interface GridLayoutProps {
    gridSize: number;
    updateAppState: ({}) => void; // TODO Improve this definition
}

const GridLayoutControls = (props: GridLayoutProps) => {
    function getClass(size: number) {
        return props.gridSize !== size ? "button viewButton" : "button viewButton active";
    }

    function getImage(size: number) {
        // This entire method will be removed shortly.
        if (size === 3) return props.gridSize !== 303 ? `icon3upBlue.png` : `icon3upWhite.png`;
        if (size === 2) return props.gridSize !== 460 ? `icon2upBlue.png` : `icon2upWhite.png`;
        if (size === 4) return props.gridSize !== 225 ? `icon4upBlue.png` : `icon4upWhite.png`;
    }

    function handleClick(size: number) {
        if (size === props.gridSize) return;
        props.updateAppState({layout: {cameraGridSize: size}});
    }

    function handleSizeSlider(event: any) {
        console.log("handleSizeSlider");
        props.updateAppState({ layout: { cameraGridSize: parseInt(event.target.value) }});
    }

    return (
        <div className="GridLayoutControls">
            <span className="title">Video Size: </span>
            <input
                onChange={handleSizeSlider}
                type="range"
                min="225"
                max="600"
                step="2"
                value={props.gridSize} />
        </div>
    );
};

export default GridLayoutControls;
