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

interface IProps {
    objects: [[number, string]]; // [id, type]
}

function getObjectTypes(objects: any) {
    const types = new Set();
    objects.forEach((item: any) => {
        types.add(item[1] === "object" ? "unknown" : item[1]);
    });

    return types;
}

function renderTypes(objects: [[number, string]]) {
    const types = getObjectTypes(objects);
    const typesArray: any = [];
    Array.from(types).map((el) => {
        switch (el) {
            case "animal":
            typesArray.push(
                <img style={{width: 18, marginRight: 4, marginTop: 4}} src="/img/animals.png"/>,
            )
            break;
            case "person":
            typesArray.push(
                <img style={{width: 18, marginRight: 4, marginTop: 4}} src="/img/people.png"/>
            )
            break;
            case "vehicle":
            typesArray.push(
                <img style={{width: 18, marginRight: 4, marginTop: 4}} src="/img/vehicles.png"/>
            )
            break;
            default:
            typesArray.push(
                <img style={{width: 18, marginRight: 4, marginTop: 4}} src="/img/unknown-objects.png"/>
            )
        }
    })
    return typesArray;
}

export const ClipObjectTypes = (props: IProps) => {
    return (
        <div className="objectTypes">
            {renderTypes(props.objects)}
        </div>
    )
};
