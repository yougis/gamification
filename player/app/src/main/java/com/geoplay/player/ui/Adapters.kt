package com.geoplay.player.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.geoplay.player.R
import com.geoplay.shared.model.GameNode

class QueueAdapter(
    private val queue: List<String>,
    private val onClick: (String) -> Unit
) : RecyclerView.Adapter<QueueAdapter.QueueViewHolder>() {

    inner class QueueViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvNodeId: TextView = view.findViewById(R.id.tvQueueItem)
        val tvPosition: TextView = view.findViewById(R.id.tvQueuePosition)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): QueueViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_queue, parent, false)
        return QueueViewHolder(view)
    }

    override fun onBindViewHolder(holder: QueueViewHolder, position: Int) {
        val nodeId = queue[position]
        holder.tvNodeId.text = nodeId
        holder.tvPosition.text = "${position + 1}."
        holder.itemView.setOnClickListener { onClick(nodeId) }
    }

    override fun getItemCount() = queue.size
}

class PolygonAdapter(
    private val polygons: List<PolygonItem>
) : RecyclerView.Adapter<PolygonAdapter.PolygonViewHolder>() {

    data class PolygonItem(
        val id: Int,
        val x: Float,
        val y: Float,
        val w: Float,
        val h: Float
    )

    inner class PolygonViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvPolygon: TextView = view.findViewById(R.id.tvPolygon)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PolygonViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_polygon, parent, false)
        return PolygonViewHolder(view)
    }

    override fun onBindViewHolder(holder: PolygonViewHolder, position: Int) {
        val poly = polygons[position]
        holder.tvPolygon.text = "Polygone #${position + 1}: x=${poly.x}%, y=${poly.y}%, w=${poly.w}%, h=${poly.h}%"
    }

    override fun getItemCount() = polygons.size

    fun submitList(polygons: List<PolygonItem>) {
        // This would be called with a list
    }
}

class LogAdapter(private val logs: List<String>) : RecyclerView.Adapter<LogAdapter.LogViewHolder>() {

    inner class LogViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val tvLog: TextView = view.findViewById(android.R.id.text1)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): LogViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(android.R.layout.simple_list_item_1, parent, false)
        return LogViewHolder(view)
    }

    override fun onBindViewHolder(holder: LogViewHolder, position: Int) {
        holder.tvLog.text = logs[position]
    }

    override fun getItemCount() = logs.size
}