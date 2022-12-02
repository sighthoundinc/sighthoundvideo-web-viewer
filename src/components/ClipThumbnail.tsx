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

interface ClipThumbnailProps {
    id: string;
    cameraName: string;
    thumbnailTimeArray: [number, number];
    getThumbnailUri: any;
}

interface ClipThumbnailState {
    imageSrc: string;
}

function padZeros(numberToPad: number) {
    const numString = "000" + numberToPad;
    return numString.substr(numString.length-3);
}

export default class ClipThumbnail extends React.Component<ClipThumbnailProps, ClipThumbnailState> {
    element: HTMLImageElement;
    loading: boolean;
    loaded: boolean;

    constructor(props: ClipThumbnailProps) {
        super(props);
        this.state = {
            imageSrc: undefined
        };

        this.loading = false;
        this.loaded = false;
    }

    componentDidMount() {
        console.log("ClipThumbnail - ComponentDidMount");
    }

    getThumbnailUriFromServer() {
        if (!this.loading) {
            this.loading = true;
            this.props.getThumbnailUri([[this.props.cameraName, [this.props.thumbnailTimeArray[0].valueOf(), this.props.thumbnailTimeArray[1].valueOf()]]]).then(
                (response: any) => {
                    console.log("Thumnail uri results", this.props.cameraName, this.props.thumbnailTimeArray[0] + ''+ this.props.thumbnailTimeArray[1], response);
                    this.setState({
                        imageSrc: response[0]
                    }, () => {
                        this.loaded = true;
                    });
                }
            ).catch((err: any) => {
                console.log("**** ERROR getting uris", err.res.status);
            }).finally(()=>{
                this.loading = false;
            });
        }

        return '/img/connecting.gif';
    }

    getThumbnail() {
        // console.log("getThumbnail called", this.props.cameraName, this.props.thumbnailTimeArray[0] + ''+ this.props.thumbnailTimeArray[1]);
        if (this.state.imageSrc) {
            console.log("image found in state", this.state.imageSrc);
            return this.state.imageSrc;
        }

        const src = `/remote/${this.props.cameraName}${this.props.thumbnailTimeArray[0]}${padZeros(this.props.thumbnailTimeArray[1])}.jpg?gen`;
        // console.log("Trying hard-coded image path", src);
        // TODO Try using thumbnail built from camera name and time first.
        // If it errors, then call get methods.
        return src;
    }

    handleImageError() {
        console.log("handleImageError", this.loaded, this.loading, this.state.imageSrc);
        if (!this.loaded) {
            this.setState({imageSrc: '/img/connecting.gif'});
            this.getThumbnailUriFromServer();
        } else {
            console.log("Image error but already in state", this.state.imageSrc);
            this.setState({imageSrc: '/img/could-not-connect.png'});
        }
    }

    render() {
        return (
            <img ref={(val) => this.element = val}
                id={this.props.id}
                src={this.getThumbnail()}
                onError={this.handleImageError.bind(this)} />
        );
    }
}
