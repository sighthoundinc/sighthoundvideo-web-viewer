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
import {Camera} from './../sighthound';
import {Link} from 'react-router-dom';
import CameraImageThumbnail from './CameraImageThumbnail';

interface Props {
    cameras: Map<string, Camera>;
    selectedCamera: Camera;
}

const CamerasScrollingList = (props: Props) => {
    function handleImageError() {
        this.src = '/img/cameraOff.gif';
    }

    function renderClipList() {
        const cameraElements: JSX.Element[] = [];
        props.cameras.forEach((camera: Camera) => {
            if (!camera || !camera.active || camera.frozen) return;
            let selectedClass = '';
            if (props.selectedCamera === camera) selectedClass = 'active';

            const uniqueId = `${camera.name}`;
            cameraElements.push(
                <Link to={`/live/${camera.name}`} key={uniqueId}>
                    <div className={`clipThumb clipLink ${selectedClass}`}>
                        <div className="clipThumbImage">
                            <CameraImageThumbnail
                                camera={camera}
                                pollingMs={2000}/>
                        </div>

                        <div className="clipThumbDescription">
                            <strong>{camera.name}</strong><br />
                        </div>
                    </div>
                </Link>
            );
        });

        return cameraElements;
    }

    return (
        <div id="clipsList" className="clipsList">{renderClipList()}</div>
    );
};

export default CamerasScrollingList;
